import { efiClient } from './efi.client';
import { IntegrationError } from './efi.errors';
import { normalizeEfiCharge } from './efi.normalizer';
import { BoletoActionBody, BoletoCreateBody, BoletoSyncBody, BridgeResponse } from './efi.types';

const ensureChargeId = (raw: Record<string, unknown>): string => {
  const chargeId = raw.charge_id ?? raw.chargeId ?? raw.id;
  if (!chargeId) {
    throw new IntegrationError(502, 'EFI_INVALID_RESPONSE', 'Resposta da EFI sem charge id.', raw);
  }

  return String(chargeId);
};

export const createBoleto = async (payload: BoletoCreateBody, requestId: string): Promise<BridgeResponse> => {
  const chargeRaw = await efiClient.charge({
    items: [
      {
        name: payload.empresaNome ?? 'Boleto Sindicato',
        value: Math.round(payload.valorCalculado * 100),
        amount: 1
      }
    ],
    metadata: {
      tipo: payload.tipo,
      empresaId: payload.empresaId,
      dataVencimento: payload.dataVencimento
    }
  });

  const chargeId = ensureChargeId(chargeRaw);

  const billetRaw = await efiClient.billet(chargeId, {
    expire_at: payload.dataVencimento,
    message: payload.mensagemPersonalizada ?? '',
    customer: {
      name: payload.empresaNome ?? 'Empresa'
    }
  });

  return {
    ok: true,
    acao: 'criar',
    boleto: normalizeEfiCharge({ ...chargeRaw, ...billetRaw, charge_id: chargeId }),
    raw: { charge: chargeRaw, billet: billetRaw },
    requestId
  };
};

export const getBoleto = async (efiChargeId: string, requestId: string): Promise<BridgeResponse> => {
  const chargeRaw = await efiClient.getCharge(efiChargeId);

  return {
    ok: true,
    acao: 'consultar',
    boleto: normalizeEfiCharge({ ...chargeRaw, charge_id: efiChargeId }),
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
    boleto: normalizeEfiCharge({ ...raw, charge_id: efiChargeId }),
    raw,
    requestId
  };
};

export const syncBoletos = async (body: BoletoSyncBody, requestId: string): Promise<BridgeResponse> => {
  const boletos = await Promise.all(
    body.items.map(async (item) => {
      const raw = await efiClient.getCharge(item.efiChargeId);
      return normalizeEfiCharge({ ...raw, charge_id: item.efiChargeId });
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
