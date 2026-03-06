import { FastifyInstance } from 'fastify';
import {
  boletoActionHandler,
  createBoletoHandler,
  getBoletoHandler,
  syncBoletosHandler
} from './efi.controller';
import { requireAuth, requireFinancialRead, requireFinancialWrite } from '../auth/auth.middleware';
import { BoletoActionBody, BoletoCreateBody, BoletoSyncBody } from './efi.types';

export const efiRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post<{ Body: BoletoCreateBody }>(
    '/api/efi/boletos',
    { preHandler: [requireAuth, requireFinancialWrite] },
    createBoletoHandler
  );

  app.get<{ Params: { efiChargeId: string } }>(
    '/api/efi/boletos/:efiChargeId',
    { preHandler: [requireAuth, requireFinancialRead] },
    getBoletoHandler
  );

  app.post<{ Params: { efiChargeId: string }; Body: BoletoActionBody }>(
    '/api/efi/boletos/:efiChargeId/acoes',
    { preHandler: [requireAuth, requireFinancialWrite] },
    boletoActionHandler
  );

  app.post<{ Body: BoletoSyncBody }>(
    '/api/efi/boletos/sync',
    { preHandler: [requireAuth, requireFinancialRead] },
    syncBoletosHandler
  );
};
