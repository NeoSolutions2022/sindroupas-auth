import Fastify from 'fastify';
import { authRoutes } from './auth/auth.routes';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(authRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
};
