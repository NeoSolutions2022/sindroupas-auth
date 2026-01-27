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
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    request.authUser = payload;
  } catch (error) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }
};
