export class IntegrationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (details: unknown): IntegrationError => {
  return new IntegrationError(422, 'VALIDATION_ERROR', 'Payload inválido.', details);
};

export const badRequestError = (message: string, details?: unknown): IntegrationError => {
  return new IntegrationError(400, 'BAD_REQUEST', message, details);
};

interface EfiErrorContext {
  stage: 'token' | 'request';
  method: string;
  endpoint: string;
  baseUrl: string;
  requestBody?: unknown;
  responseBody?: unknown;
  responseStatus?: number;
}

export const mapEfiError = (statusCode: number, body: unknown, context: EfiErrorContext): IntegrationError => {
  const details = {
    ...context,
    responseStatus: statusCode,
    responseBody: context.responseBody ?? body
  };

  if (statusCode === 404) {
    return new IntegrationError(404, 'EFI_NOT_FOUND', 'Cobrança EFI não encontrada.', details);
  }

  if (statusCode === 409) {
    return new IntegrationError(409, 'EFI_CONFLICT', 'Conflito na operação EFI.', details);
  }

  if (statusCode === 422) {
    return new IntegrationError(422, 'EFI_VALIDATION_ERROR', 'Validação rejeitada pela EFI.', details);
  }

  if (statusCode === 401 || statusCode === 403) {
    return new IntegrationError(502, 'EFI_AUTH_REJECTED', 'Autenticação/autorização rejeitada pela EFI.', details);
  }

  if (statusCode === 504) {
    return new IntegrationError(504, 'EFI_TIMEOUT', 'Timeout na integração com a EFI.', details);
  }

  if (statusCode >= 500) {
    return new IntegrationError(502, 'EFI_UPSTREAM_ERROR', 'Erro retornado pela EFI.', details);
  }

  if (statusCode >= 400) {
    return new IntegrationError(400, 'EFI_BAD_REQUEST', 'Requisição inválida para EFI.', details);
  }

  return new IntegrationError(502, 'EFI_UNKNOWN_ERROR', 'Falha inesperada na integração EFI.', details);
};
