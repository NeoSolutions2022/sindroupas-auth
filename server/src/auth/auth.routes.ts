import { FastifyInstance } from 'fastify';
import {
  adminBootstrapDefaultAppUsers,
  adminCreateAppUser,
  adminListAppUsers,
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

  app.get('/admin/app-users', { preHandler: [requireAuth, requireAdmin] }, adminListAppUsers);
  app.post('/admin/app-users', { preHandler: [requireAuth, requireAdmin] }, adminCreateAppUser);
  app.patch('/admin/app-users/:id', { preHandler: [requireAuth, requireAdmin] }, adminUpdateAppUser);
  app.patch('/admin/app-users/:id/status', { preHandler: [requireAuth, requireAdmin] }, adminSetAppUserActive);
  app.patch(
    '/admin/app-users/:id/reset-password',
    { preHandler: [requireAuth, requireAdmin] },
    adminResetAppUserPassword
  );
  app.post(
    '/admin/app-users/bootstrap-defaults',
    { preHandler: [requireAuth, requireAdmin] },
    adminBootstrapDefaultAppUsers
  );
};
