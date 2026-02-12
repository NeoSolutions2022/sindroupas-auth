import { pool } from '../db/pool';
import { efiClient } from './efi.client';
import { IntegrationError } from './efi.errors';
import { normalizeEfiCharge } from './efi.normalizer';
import { BoletoActionBody, BoletoCreateBody, BoletoSyncBody, BridgeResponse } from './efi.types';

interface EmpresaLookup {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
}

const ensureChargeId = (raw: Record<string, unknown>): string => {
  const data = (raw.data as Record<string, unknown> | undefined) ?? raw;
  const chargeId = data.charge_id ?? data.chargeId ?? data.id;
  if (!chargeId) {
    throw new IntegrationError(502, 'EFI_INVALID_RESPONSE', 'Resposta da EFI sem charge id.', raw);
  }

  return String(chargeId);
};

const normalizeDueDate = (value: string): string => {
  const input = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const brDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  if (brDate) {
    return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;
  }

  throw new IntegrationError(400, 'BAD_REQUEST', 'dataVencimento deve estar em yyyy-MM-dd ou dd/MM/yyyy.');
};

const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

const getEmpresa = async (empresaId: string): Promise<EmpresaLookup | null> => {
  const result = await pool.query<EmpresaLookup>(
    `SELECT id, razao_social, nome_fantasia, cnpj, email
     FROM empresas
     WHERE id = $1`,
    [empresaId]
  );

  return result.rows[0] ?? null;
};

export const createBoleto = async (payload: BoletoCreateBody, requestId: string): Promise<BridgeResponse> => {
  const dueDate = normalizeDueDate(payload.dataVencimento);

  const chargeRaw = await efiClient.charge({
    items: [
      {
        name: payload.empresaNome ?? 'Boleto Sindicato',
        value: Math.round(payload.valorCalculado * 100),
        amount: 1
      }
    ],
    metadata: payload.empresaId
      ? {
          custom_id: payload.empresaId
        }
      : undefined
  });

  const chargeId = ensureChargeId(chargeRaw);

  const empresa = payload.empresaId ? await getEmpresa(payload.empresaId) : null;
  const cnpj = empresa?.cnpj ? onlyDigits(empresa.cnpj) : '';

  if (!cnpj || cnpj.length !== 14) {
    throw new IntegrationError(
      400,
      'BAD_REQUEST',
      'Para emitir boleto é necessário CNPJ válido da empresa (14 dígitos) no cadastro.'
    );
  }

  const companyName = empresa?.razao_social ?? empresa?.nome_fantasia ?? payload.empresaNome ?? 'Empresa';
  const companyEmail = empresa?.email ?? 'financeiro@sindroupas.local';

  const billetRaw = await efiClient.pay(chargeId, {
    payment: {
      banking_billet: {
        expire_at: dueDate,
        customer: {
          email: companyEmail,
          juridical_person: {
            corporate_name: companyName,
            cnpj
          }
        },
        message: payload.mensagemPersonalizada ?? ''
      }
    }
  });

  return {
    ok: true,
    acao: 'criar',
    boleto: normalizeEfiCharge({
      ...(chargeRaw.data as Record<string, unknown> | undefined),
      ...(billetRaw.data as Record<string, unknown> | undefined),
      charge_id: chargeId
    }),
    raw: { charge: chargeRaw, billet: billetRaw },
    requestId
  };
};

export const getBoleto = async (efiChargeId: string, requestId: string): Promise<BridgeResponse> => {
  const chargeRaw = await efiClient.getCharge(efiChargeId);

  return {
    ok: true,
    acao: 'consultar',
    boleto: normalizeEfiCharge({
      ...(chargeRaw.data as Record<string, unknown> | undefined),
      charge_id: efiChargeId
    }),
    raw: chargeRaw,
    requestId
  };
};

export const executeBoletoAction = async (
  efiChargeId: string,
  body: BoletoActionBody,
  requestId: string
): Promise<BridgeResponse> => {
  const payload = body.payload ?? {};
  let raw: Record<string, unknown>;

  switch (body.acao) {
    case 'cancelar':
      raw = await efiClient.cancel(efiChargeId, payload);
      break;
    case 'reenviar_boleto':
      raw = await efiClient.resend(efiChargeId, payload);
      break;
    case 'historico':
      raw = await efiClient.history(efiChargeId, payload);
      break;
    case 'registrar_pagamento':
      raw = await efiClient.pay(efiChargeId, payload);
      break;
    case 'baixar_manual':
      raw = await efiClient.settle(efiChargeId, payload);
      break;
    default:
      throw new IntegrationError(400, 'INVALID_ACTION', 'Ação não suportada.');
  }

  return {
    ok: true,
    acao: body.acao,
    boleto: normalizeEfiCharge({
      ...(raw.data as Record<string, unknown> | undefined),
      charge_id: efiChargeId
    }),
    raw,
    requestId
  };
};

export const syncBoletos = async (body: BoletoSyncBody, requestId: string): Promise<BridgeResponse> => {
  const boletos = await Promise.all(
    body.items.map(async (item) => {
      const raw = await efiClient.getCharge(item.efiChargeId);
      return normalizeEfiCharge({
        ...(raw.data as Record<string, unknown> | undefined),
        charge_id: item.efiChargeId
      });
    })
  );

  return {
    ok: true,
    acao: 'sync',
    boletos,
    raw: { total: boletos.length, force: body.force ?? false, motivo: body.motivo ?? null },
    requestId
  };
};
