import { badRequestError, validationError } from './efi.errors';
import { BoletoActionBody, BoletoCreateBody, BoletoSyncBody } from './efi.types';

interface ValidationIssue {
  field: string;
  message: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const mustBeNonEmptyString = (issues: ValidationIssue[], field: string, value: unknown): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ field, message: 'Campo obrigatório.' });
  }
};

const mustBeNumber = (issues: ValidationIssue[], field: string, value: unknown): void => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ field, message: 'Campo deve ser numérico.' });
  }
};

export const validateCreateBody = (payload: unknown): BoletoCreateBody => {
  if (!isObject(payload)) {
    throw validationError([{ field: 'body', message: 'Body deve ser um objeto.' }]);
  }

  const body = payload as Partial<BoletoCreateBody>;
  const issues: ValidationIssue[] = [];

  if (body.tipo !== 'mensalidade' && body.tipo !== 'contribuicao') {
    issues.push({ field: 'tipo', message: "Deve ser 'mensalidade' ou 'contribuicao'." });
  }

  if (body.empresaId !== undefined && (typeof body.empresaId !== 'string' || !body.empresaId.trim())) {
    issues.push({ field: 'empresaId', message: 'Quando enviado, deve ser string não vazia.' });
  }

  mustBeNonEmptyString(issues, 'dataVencimento', body.dataVencimento);
  mustBeNumber(issues, 'valorCalculado', body.valorCalculado);

  if (typeof body.valorCalculado === 'number' && body.valorCalculado <= 0) {
    issues.push({ field: 'valorCalculado', message: 'Deve ser maior que zero.' });
  }


  if (body.tipo === 'mensalidade') {
    mustBeNonEmptyString(issues, 'competenciaInicial', body.competenciaInicial);
    mustBeNonEmptyString(issues, 'competenciaFinal', body.competenciaFinal);
    mustBeNonEmptyString(issues, 'faixaId', body.faixaId);
  }

  if (body.tipo === 'contribuicao') {
    mustBeNonEmptyString(issues, 'anoContribuicao', body.anoContribuicao);
    mustBeNonEmptyString(issues, 'periodicidade', body.periodicidade);
    mustBeNonEmptyString(issues, 'parcelas', body.parcelas);
    mustBeNonEmptyString(issues, 'baseCalculo', body.baseCalculo);
    mustBeNonEmptyString(issues, 'percentual', body.percentual);
  }

  if (issues.length > 0) {
    throw validationError(issues);
  }

  return body as BoletoCreateBody;
};

const actionRules: Record<string, string[]> = {
  cancelar: ['motivo'],
  reenviar_boleto: ['email'],
  historico: ['descricao'],
  registrar_pagamento: ['dataPagamento', 'valor'],
  baixar_manual: ['dataLiquidacao', 'valorLiquidado']
};

export const validateActionBody = (payload: unknown): BoletoActionBody => {
  if (!isObject(payload)) {
    throw validationError([{ field: 'body', message: 'Body deve ser um objeto.' }]);
  }

  const body = payload as Partial<BoletoActionBody>;
  const issues: ValidationIssue[] = [];

  if (!body.acao || !Object.keys(actionRules).includes(body.acao)) {
    issues.push({
      field: 'acao',
      message:
        "Ação inválida. Use: cancelar, reenviar_boleto, historico, registrar_pagamento, baixar_manual."
    });
  }

  const payloadBody = isObject(body.payload) ? body.payload : {};
  if (body.acao && actionRules[body.acao]) {
    for (const field of actionRules[body.acao]) {
      const value = payloadBody[field];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        issues.push({ field: `payload.${field}`, message: 'Campo obrigatório para a ação.' });
      }
    }
  }

  if (issues.length > 0) {
    throw validationError(issues);
  }

  return {
    acao: body.acao as BoletoActionBody['acao'],
    contexto: isObject(body.contexto) ? body.contexto : undefined,
    payload: payloadBody
  };
};

export const validateSyncBody = (payload: unknown): BoletoSyncBody => {
  if (!isObject(payload)) {
    throw validationError([{ field: 'body', message: 'Body deve ser um objeto.' }]);
  }

  const body = payload as Partial<BoletoSyncBody>;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw validationError([{ field: 'items', message: 'Envie ao menos um efiChargeId.' }]);
  }

  const invalidItem = body.items.find(
    (item) => !item || typeof item.efiChargeId !== 'string' || item.efiChargeId.trim().length === 0
  );

  if (invalidItem) {
    throw validationError([
      { field: 'items.efiChargeId', message: 'Todos os itens devem ter efiChargeId válido.' }
    ]);
  }

  if (body.force !== undefined && typeof body.force !== 'boolean') {
    throw badRequestError('Campo force deve ser booleano.');
  }

  return {
    items: body.items,
    force: body.force,
    motivo: body.motivo
  } as BoletoSyncBody;
};
