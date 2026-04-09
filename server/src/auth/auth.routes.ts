import { FastifyInstance } from 'fastify';
import {
  adminCreateAppUser,
  adminResetAppUserPassword,
  adminSetAppUserActive,
  adminUpdateAppUser,
  login,
  me
} from './auth.controller';
import { requireAdmin, requireAuth } from './auth.middleware';

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/auth/login', login);
  app.get('/auth/me', { preHandler: requireAuth }, me);

  app.post('/admin/app-users', { preHandler: [requireAuth, requireAdmin] }, adminCreateAppUser);
  app.put('/admin/app-users/:id', { preHandler: [requireAuth, requireAdmin] }, adminUpdateAppUser);
  app.patch('/admin/app-users/:id/active', { preHandler: [requireAuth, requireAdmin] }, adminSetAppUserActive);
  app.post(
    '/admin/app-users/:id/reset-password',
    { preHandler: [requireAuth, requireAdmin] },
    adminResetAppUserPassword
  );
};
