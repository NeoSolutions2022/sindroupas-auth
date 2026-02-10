import cors from '@fastify/cors';
import Fastify from 'fastify';
import { env } from './config/env';
import { authRoutes } from './auth/auth.routes';

const resolveCorsOrigin = (): string[] | boolean => {
  if (env.corsOrigin === '*') {
    return true;
  }

  return env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: resolveCorsOrigin(),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  app.register(authRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
};
