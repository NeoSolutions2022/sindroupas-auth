import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from './auth.types';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthTokenPayload;
  }
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as Partial<AuthTokenPayload> & {
      sub?: string;
      role?: string;
      email?: string;
    };

    const userId = decoded.user_id ?? decoded['x-hasura-user-id'] ?? decoded.sub;
    const profileCode = decoded.profile_code ?? decoded['x-hasura-profile-code'];

    if (!userId || !decoded.role || !decoded.email || !profileCode) {
      reply.status(401).send({ message: 'Token inválido.' });
      return;
    }

    request.authUser = {
      ...decoded,
      sub: decoded.sub ?? userId,
      user_id: userId,
      profile_code: profileCode,
      role: decoded.role as 'admin' | 'user',
      email: decoded.email,
      'x-hasura-default-role':
        (decoded['x-hasura-default-role'] as 'admin' | 'user') ?? (decoded.role as 'admin' | 'user'),
      'x-hasura-allowed-roles':
        (decoded['x-hasura-allowed-roles'] as Array<'admin' | 'user'>) ?? ([decoded.role] as Array<'admin' | 'user'>),
      'x-hasura-user-id': decoded['x-hasura-user-id'] ?? userId,
      'x-hasura-profile-code': decoded['x-hasura-profile-code'] ?? profileCode,
      'https://hasura.io/jwt/claims':
        decoded['https://hasura.io/jwt/claims'] ??
        ({
          'x-hasura-default-role': decoded.role as 'admin' | 'user',
          'x-hasura-allowed-roles': [decoded.role as 'admin' | 'user'],
          'x-hasura-user-id': userId,
          'x-hasura-profile-code': profileCode
        } as AuthTokenPayload['https://hasura.io/jwt/claims'])
    };
  } catch (error) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.authUser || request.authUser.role !== 'admin') {
    reply.status(403).send({ message: 'Acesso negado.' });
  }
};
