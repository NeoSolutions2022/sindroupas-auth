import { FastifyInstance } from 'fastify';
import { login, me } from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/auth/login', login);
  app.get('/auth/me', { preHandler: requireAuth }, me);
};
