import { FastifyReply, FastifyRequest } from 'fastify';
import { IntegrationError } from './efi.errors';
import { createBoleto, executeBoletoAction, getBoleto, syncBoletos } from './efi.service';
import { validateActionBody, validateCreateBody, validateSyncBody } from './efi.validation';
import { BoletoActionBody, BoletoCreateBody, BoletoSyncBody } from './efi.types';

const handleControllerError = (error: unknown, reply: FastifyReply, requestId: string): void => {
  if (error instanceof IntegrationError) {
    reply.status(error.statusCode).send({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      requestId
    });
    return;
  }

  reply.status(500).send({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno inesperado.'
    },
    requestId
  });
};

const withRouteLog = async <T>(
  request: FastifyRequest,
  action: string,
  efiChargeId: string | null,
  fn: () => Promise<T>
): Promise<T> => {
  const startedAt = Date.now();

  try {
    const result = await fn();
    request.log.info(
      {
        requestId: request.id,
        route: request.routeOptions.url,
        action,
        efiChargeId,
        durationMs: Date.now() - startedAt,
        result: 'success'
      },
      'EFI bridge request finished'
    );
    return result;
  } catch (error) {
    request.log.error(
      {
        requestId: request.id,
        route: request.routeOptions.url,
        action,
        efiChargeId,
        durationMs: Date.now() - startedAt,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'EFI bridge request failed'
    );
    throw error;
  }
};

export const createBoletoHandler = async (
  request: FastifyRequest<{ Body: BoletoCreateBody }>,
  reply: FastifyReply
): Promise<void> => {
  const requestId = request.id;

  try {
    const body = validateCreateBody(request.body);
    const result = await withRouteLog(request, 'criar', null, () => createBoleto(body, requestId));
    reply.status(201).send(result);
  } catch (error) {
    handleControllerError(error, reply, requestId);
  }
};

export const getBoletoHandler = async (
  request: FastifyRequest<{ Params: { efiChargeId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const requestId = request.id;

  try {
    const { efiChargeId } = request.params;
    const result = await withRouteLog(request, 'consultar', efiChargeId, () =>
      getBoleto(efiChargeId, requestId)
    );
    reply.status(200).send(result);
  } catch (error) {
    handleControllerError(error, reply, requestId);
  }
};

export const boletoActionHandler = async (
  request: FastifyRequest<{ Params: { efiChargeId: string }; Body: BoletoActionBody }>,
  reply: FastifyReply
): Promise<void> => {
  const requestId = request.id;

  try {
    const { efiChargeId } = request.params;
    const body = validateActionBody(request.body);
    const result = await withRouteLog(request, body.acao, efiChargeId, () =>
      executeBoletoAction(efiChargeId, body, requestId)
    );
    reply.status(200).send(result);
  } catch (error) {
    handleControllerError(error, reply, requestId);
  }
};

export const syncBoletosHandler = async (
  request: FastifyRequest<{ Body: BoletoSyncBody }>,
  reply: FastifyReply
): Promise<void> => {
  const requestId = request.id;

  try {
    const body = validateSyncBody(request.body);
    const result = await withRouteLog(request, 'sync', null, () => syncBoletos(body, requestId));
    reply.status(200).send(result);
  } catch (error) {
    handleControllerError(error, reply, requestId);
  }
};
