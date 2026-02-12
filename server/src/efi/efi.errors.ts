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

export const mapEfiError = (statusCode: number, body: unknown): IntegrationError => {
  if (statusCode === 404) {
    return new IntegrationError(404, 'EFI_NOT_FOUND', 'Cobrança EFI não encontrada.', body);
  }

  if (statusCode === 409) {
    return new IntegrationError(409, 'EFI_CONFLICT', 'Conflito na operação EFI.', body);
  }

  if (statusCode === 504) {
    return new IntegrationError(504, 'EFI_TIMEOUT', 'Timeout na integração com a EFI.', body);
  }

  if (statusCode >= 500) {
    return new IntegrationError(502, 'EFI_UPSTREAM_ERROR', 'Erro retornado pela EFI.', body);
  }

  if (statusCode >= 400) {
    return new IntegrationError(400, 'EFI_BAD_REQUEST', 'Requisição inválida para EFI.', body);
  }

  return new IntegrationError(502, 'EFI_UNKNOWN_ERROR', 'Falha inesperada na integração EFI.', body);
};
