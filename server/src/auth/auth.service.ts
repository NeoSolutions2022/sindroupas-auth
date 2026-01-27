import bcrypt from 'bcrypt';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { AdminUser } from './auth.types';

type AdminUserRecord = AdminUser & { password_hash: string };

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

export const comparePassword = async (password: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.bcryptRounds);
};
