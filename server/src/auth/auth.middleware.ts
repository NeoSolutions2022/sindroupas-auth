import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from './auth.types';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthTokenPayload;
  }
}

const financialWriteRoles: AuthTokenPayload['role'][] = ['admin', 'superadmin'];
const financialReadRoles: AuthTokenPayload['role'][] = ['admin', 'superadmin'];

const hasScopeOrRole = (
  request: FastifyRequest,
  requiredScope: string,
  allowedRoles: AuthTokenPayload['role'][]
): boolean => {
  const user = request.authUser;
  if (!user) {
    return false;
  }

  if (user.scopes?.includes(requiredScope)) {
    return true;
  }

  return allowedRoles.includes(user.role);
};

const verifyTokenWithAvailableSecrets = (token: string): AuthTokenPayload => {
  const secrets = [env.jwtSecret, ...env.jwtFallbackSecrets].filter(Boolean);
  let lastError: unknown;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as AuthTokenPayload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Token verification failed');
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    const payload = verifyTokenWithAvailableSecrets(token);
    request.authUser = payload;
  } catch (error) {
    request.log.warn(
      {
        requestId: request.id,
        route: request.routeOptions.url,
        error: error instanceof Error ? error.message : 'Token verification failed',
        fallbackSecretsCount: env.jwtFallbackSecrets.length
      },
      'JWT verification failed'
    );

    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }
};

export const requireFinancialWrite = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!hasScopeOrRole(request, 'financeiro:write', financialWriteRoles)) {
    reply.status(403).send({ message: 'Sem permissão para ação financeira.' });
    return;
  }
};

export const requireFinancialRead = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!hasScopeOrRole(request, 'financeiro:read', financialReadRoles)) {
    reply.status(403).send({ message: 'Sem permissão para consulta financeira.' });
    return;
  }
};
