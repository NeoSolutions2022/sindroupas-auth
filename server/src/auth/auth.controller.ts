import { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { comparePassword, findAdminByEmail, findAdminById } from './auth.service';
import { AuthTokenPayload } from './auth.types';

interface LoginBody {
  email?: string;
  password?: string;
}

export const login = async (
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> => {
  const { email, password } = request.body;

  if (!email || !password) {
    reply.status(400).send({ message: 'Email e senha são obrigatórios.' });
    return;
  }

  const admin = await findAdminByEmail(email);

  if (!admin) {
    reply.status(401).send({ message: 'Credenciais inválidas.' });
    return;
  }

  if (admin.status === 'blocked') {
    reply.status(403).send({ message: 'Usuário bloqueado.' });
    return;
  }

  const passwordMatches = await comparePassword(password, admin.password_hash);

  if (!passwordMatches) {
    reply.status(401).send({ message: 'Credenciais inválidas.' });
    return;
  }

  const payload: AuthTokenPayload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role
  };

  const expiresIn = env.jwtExpiresIn as SignOptions['expiresIn'];
  const accessToken = jwt.sign(payload, env.jwtSecret as Secret, { expiresIn });

  reply.status(200).send({
    access_token: accessToken,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status
    }
  });
};

export const me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.authUser) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  const admin = await findAdminById(request.authUser.sub);

  if (!admin) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  reply.status(200).send({
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status
    }
  });
};
