import bcrypt from 'bcrypt';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { AdminUser, AppProfile, AppUser, AppUserListItem } from './auth.types';

type AdminUserRecord = AdminUser & { password_hash: string };
type AppUserRecord = AppUser & { password_hash: string };

interface AppUserRow {
  id: string;
  email: string;
  name: string | null;
  profile_id: string;
  profile_code: string;
  is_active: boolean;
  created_at: string;
}

const appUserBaseSelect = `
  SELECT u.id,
         u.email,
         u.name,
         u.profile_id,
         p.code AS profile_code,
         u.is_active,
         u.created_at
  FROM app_users u
  INNER JOIN app_profiles p ON p.id = u.profile_id
`;

export const appUsersHasAuthUserIdColumn = async (): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'app_users'
        AND column_name = 'auth_user_id'
    ) AS exists`
  );

  return Boolean(result.rows[0]?.exists);
};

export const findAdminByEmail = async (email: string): Promise<AdminUserRecord | null> => {
  const result = await pool.query<AdminUserRecord>(
    `SELECT id, email, name, role, status, password_hash
     FROM admin_users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] ?? null;
};

export const findAdminById = async (id: string): Promise<AdminUser | null> => {
  const result = await pool.query<AdminUser>(
    `SELECT id, email, name, role, status
     FROM admin_users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
};

export const findAppUserByEmail = async (email: string): Promise<AppUserRecord | null> => {
  const result = await pool.query<AppUserRecord>(
    `SELECT u.id,
            u.email,
            u.name,
            u.profile_id,
            p.code AS profile_code,
            u.is_active,
            u.created_at,
            u.password_hash
       FROM app_users u
       INNER JOIN app_profiles p ON p.id = u.profile_id
     WHERE u.email = $1`,
    [email]
  );

  return result.rows[0] ?? null;
};

export const findAppUserById = async (id: string): Promise<AppUser | null> => {
  const result = await pool.query<AppUser>(
    `${appUserBaseSelect}
     WHERE u.id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
};

export const createAppUser = async (input: {
  email: string;
  password_hash: string;
  name: string | null;
  profile_id: string;
  is_active?: boolean;
}): Promise<AppUser> => {
  const hasAuthUserIdColumn = await appUsersHasAuthUserIdColumn();
  const result = hasAuthUserIdColumn
    ? await pool.query<AppUserRow>(
        `INSERT INTO app_users (email, password_hash, name, profile_id, is_active, auth_user_id)
         VALUES ($1, $2, $3, $4, COALESCE($5, true), gen_random_uuid())
         RETURNING id, email, name, profile_id, is_active, created_at`,
        [input.email, input.password_hash, input.name, input.profile_id, input.is_active]
      )
    : await pool.query<AppUserRow>(
        `INSERT INTO app_users (email, password_hash, name, profile_id, is_active)
         VALUES ($1, $2, $3, $4, COALESCE($5, true))
         RETURNING id, email, name, profile_id, is_active, created_at`,
        [input.email, input.password_hash, input.name, input.profile_id, input.is_active]
      );

  const user = result.rows[0];
  return findAppUserById(user.id) as Promise<AppUser>;
};

export const updateAppUser = async (
  id: string,
  input: {
    email?: string;
    name?: string | null;
    profile_id?: string;
  }
): Promise<AppUser | null> => {
  const result = await pool.query<AppUserRow>(
    `UPDATE app_users
     SET email = COALESCE($2, email),
         name = COALESCE($3, name),
         profile_id = COALESCE($4, profile_id)
     WHERE id = $1
     RETURNING id`,
    [id, input.email, input.name, input.profile_id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAppUserById(id);
};

export const setAppUserActiveState = async (id: string, isActive: boolean): Promise<AppUser | null> => {
  const result = await pool.query<{ id: string }>(
    `UPDATE app_users
     SET is_active = $2
     WHERE id = $1
     RETURNING id`,
    [id, isActive]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findAppUserById(id);
};

export const resetAppUserPassword = async (id: string, passwordHash: string): Promise<boolean> => {
  const result = await pool.query<{ id: string }>(
    `UPDATE app_users
     SET password_hash = $2
     WHERE id = $1
     RETURNING id`,
    [id, passwordHash]
  );

  return Boolean(result.rows[0]);
};

export const listAppUsers = async (): Promise<AppUserListItem[]> => {
  const result = await pool.query<AppUserListItem>(
    `SELECT u.id,
            u.email,
            u.name,
            p.code AS profile_code,
            p.code AS profile_label,
            u.is_active,
            u.created_at
       FROM app_users u
       INNER JOIN app_profiles p ON p.id = u.profile_id
      ORDER BY u.created_at ASC`
  );

  return result.rows;
};

export const findAppProfileByCode = async (code: string): Promise<AppProfile | null> => {
  const result = await pool.query<AppProfile>(
    `SELECT id, code
       FROM app_profiles
      WHERE code = $1`,
    [code]
  );

  return result.rows[0] ?? null;
};

export const comparePassword = async (password: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.bcryptRounds);
};
