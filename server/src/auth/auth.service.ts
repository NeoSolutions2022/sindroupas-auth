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

export const getAppUsersColumnInfo = async (): Promise<{
  hasAuthUserId: boolean;
  hasName: boolean;
  hasFullName: boolean;
}> => {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'app_users'
        AND column_name IN ('auth_user_id', 'name', 'full_name')`
  );

  const columns = new Set(result.rows.map((row) => row.column_name));

  return {
    hasAuthUserId: columns.has('auth_user_id'),
    hasName: columns.has('name'),
    hasFullName: columns.has('full_name')
  };
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
  const columnInfo = await getAppUsersColumnInfo();

  const columns: string[] = ['email', 'password_hash', 'profile_id', 'is_active'];
  const values: string[] = [];
  const params: Array<string | boolean | null> = [];
  const addParam = (value: string | boolean | null): string => {
    params.push(value);
    return `$${params.length}`;
  };

  values.push(addParam(input.email));
  values.push(addParam(input.password_hash));
  values.push(addParam(input.profile_id));
  values.push(`COALESCE(${addParam(input.is_active ?? true)}, true)`);

  if (columnInfo.hasName) {
    columns.push('name');
    values.push(addParam(input.name));
  }

  if (columnInfo.hasFullName) {
    columns.push('full_name');
    values.push(addParam(input.name));
  }

  if (columnInfo.hasAuthUserId) {
    columns.push('auth_user_id');
    values.push('gen_random_uuid()');
  }

  const result = await pool.query<AppUserRow>(
    `INSERT INTO app_users (${columns.join(', ')})
     VALUES (${values.join(', ')})
     RETURNING id, email, name, profile_id, is_active, created_at`,
    params
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
