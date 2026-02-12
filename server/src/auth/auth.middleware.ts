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


export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    request.authUser = payload;
  } catch (error) {
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
