import { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import {
  comparePassword,
  createAppUser,
  findAdminByEmail,
  findAdminById,
  findAppUserByEmail,
  findAppUserById,
  hashPassword,
  resetAppUserPassword,
  setAppUserActiveState,
  updateAppUser
} from './auth.service';
import { AppUser, AuthRole, AuthTokenPayload } from './auth.types';

interface LoginBody {
  email?: string;
  password?: string;
}

interface CreateAppUserBody {
  email?: string;
  password?: string;
  name?: string;
  profile_id?: string;
  is_active?: boolean;
}

interface UpdateAppUserBody {
  email?: string;
  name?: string;
  profile_id?: string;
}

interface UpdateAppUserActiveBody {
  is_active?: boolean;
}

interface ResetAppUserPasswordBody {
  password?: string;
}

const sanitizeAppUser = (user: AppUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  profile_id: user.profile_id,
  profile_code: user.profile_code,
  is_active: user.is_active,
  role: 'user' as const
});

const createTokenPayload = (input: {
  email: string;
  role: AuthRole;
  user_id: string;
  profile_code: string;
  allowed_roles: AuthRole[];
}): AuthTokenPayload => {
  const hasuraClaims = {
    'x-hasura-default-role': input.role,
    'x-hasura-allowed-roles': input.allowed_roles,
    'x-hasura-user-id': input.user_id,
    'x-hasura-profile-code': input.profile_code
  };

  return {
    sub: input.user_id,
    email: input.email,
    role: input.role,
    user_id: input.user_id,
    profile_code: input.profile_code,
    'x-hasura-default-role': input.role,
    'x-hasura-allowed-roles': input.allowed_roles,
    'x-hasura-user-id': input.user_id,
    'x-hasura-profile-code': input.profile_code,
    'https://hasura.io/jwt/claims': hasuraClaims
  };
};

export const login = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const body = request.body as LoginBody;
  const { email, password } = body;

  if (!email || !password) {
    reply.status(400).send({ message: 'Email e senha são obrigatórios.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const admin = await findAdminByEmail(normalizedEmail);

  if (admin) {
    if (admin.status === 'blocked') {
      reply.status(403).send({ message: 'Usuário bloqueado.' });
      return;
    }

    const passwordMatches = await comparePassword(password, admin.password_hash);

    if (!passwordMatches) {
      reply.status(401).send({ message: 'Credenciais inválidas.' });
      return;
    }

    const payload = createTokenPayload({
      email: admin.email,
      role: 'admin',
      user_id: admin.id,
      profile_code: 'admin',
      allowed_roles: ['admin', 'user']
    });

    const expiresIn = env.jwtExpiresIn as SignOptions['expiresIn'];
    const accessToken = jwt.sign(payload, env.jwtSecret as Secret, { expiresIn });

    reply.status(200).send({
      access_token: accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
        profile_code: 'admin',
        status: admin.status,
        admin_role: admin.role
      }
    });
    return;
  }

  const appUser = await findAppUserByEmail(normalizedEmail);

  if (!appUser) {
    reply.status(401).send({ message: 'Credenciais inválidas.' });
    return;
  }

  if (!appUser.is_active) {
    reply.status(403).send({ message: 'Usuário desativado.' });
    return;
  }

  const passwordMatches = await comparePassword(password, appUser.password_hash);

  if (!passwordMatches) {
    reply.status(401).send({ message: 'Credenciais inválidas.' });
    return;
  }

  const payload = createTokenPayload({
    email: appUser.email,
    role: 'user',
    user_id: appUser.id,
    profile_code: appUser.profile_code,
    allowed_roles: ['user']
  });

  const expiresIn = env.jwtExpiresIn as SignOptions['expiresIn'];
  const accessToken = jwt.sign(payload, env.jwtSecret as Secret, { expiresIn });

  reply.status(200).send({
    access_token: accessToken,
    user: sanitizeAppUser(appUser)
  });
};

export const me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.authUser) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  if (request.authUser.role === 'admin') {
    const admin = await findAdminById(request.authUser.user_id);

    if (!admin) {
      reply.status(401).send({ message: 'Token inválido.' });
      return;
    }

    reply.status(200).send({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
        profile_code: 'admin',
        status: admin.status,
        admin_role: admin.role
      }
    });
    return;
  }

  const appUser = await findAppUserById(request.authUser.user_id);

  if (!appUser || !appUser.is_active) {
    reply.status(401).send({ message: 'Token inválido.' });
    return;
  }

  reply.status(200).send({ user: sanitizeAppUser(appUser) });
};

export const adminCreateAppUser = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const body = request.body as CreateAppUserBody;
  const { email, password, name, profile_id, is_active } = body;

  if (!email || !password || !profile_id) {
    reply.status(400).send({ message: 'email, password e profile_id são obrigatórios.' });
    return;
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await createAppUser({
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      name: name?.trim() ?? null,
      profile_id,
      is_active
    });

    reply.status(201).send({ user: sanitizeAppUser(user) });
  } catch (error) {
    request.log.error({ error }, 'Falha ao criar app_user');
    reply.status(400).send({ message: 'Não foi possível criar o usuário.' });
  }
};

export const adminUpdateAppUser = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { id } = request.params as { id: string };
  const { email, name, profile_id } = request.body as UpdateAppUserBody;

  if (!email && name === undefined && !profile_id) {
    reply.status(400).send({ message: 'Informe ao menos um campo para atualizar.' });
    return;
  }

  try {
    const user = await updateAppUser(id, {
      email: email?.trim().toLowerCase(),
      name: name?.trim(),
      profile_id
    });

    if (!user) {
      reply.status(404).send({ message: 'Usuário não encontrado.' });
      return;
    }

    reply.status(200).send({ user: sanitizeAppUser(user) });
  } catch (error) {
    request.log.error({ error }, 'Falha ao atualizar app_user');
    reply.status(400).send({ message: 'Não foi possível atualizar o usuário.' });
  }
};

export const adminSetAppUserActive = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { id } = request.params as { id: string };
  const { is_active } = request.body as UpdateAppUserActiveBody;

  if (typeof is_active !== 'boolean') {
    reply.status(400).send({ message: 'is_active deve ser boolean.' });
    return;
  }

  const user = await setAppUserActiveState(id, is_active);

  if (!user) {
    reply.status(404).send({ message: 'Usuário não encontrado.' });
    return;
  }

  reply.status(200).send({ user: sanitizeAppUser(user) });
};

export const adminResetAppUserPassword = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { id } = request.params as { id: string };
  const { password } = request.body as ResetAppUserPasswordBody;

  if (!password) {
    reply.status(400).send({ message: 'password é obrigatório.' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const updated = await resetAppUserPassword(id, passwordHash);

  if (!updated) {
    reply.status(404).send({ message: 'Usuário não encontrado.' });
    return;
  }

  reply.status(204).send();
};
