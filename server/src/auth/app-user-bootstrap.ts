import { pool } from '../db/pool';
import { hashPassword } from './auth.service';

interface DefaultAppUser {
  profile_code: string;
  name: string;
  email: string;
  default_password: string;
}

interface BootstrapCreatedItem {
  email: string;
  profile_code: string;
}

interface BootstrapSkippedItem {
  email: string;
  reason: 'profile_not_found' | 'already_exists' | 'invalid_profile';
}

export interface AppUserBootstrapResult {
  created: BootstrapCreatedItem[];
  skipped: BootstrapSkippedItem[];
}

const resolvePassword = (profileCode: string, fallback: string): string => {
  const envKey = `APP_USERS_BOOTSTRAP_PASSWORD_${profileCode.toUpperCase()}`;
  return process.env[envKey] ?? fallback;
};

const DEFAULT_APP_USERS: DefaultAppUser[] = [
  {
    profile_code: 'william_representatividade',
    name: 'William',
    email: 'william.representatividade@sindroupas.local',
    default_password: resolvePassword('william_representatividade', 'William@123')
  },
  {
    profile_code: 'diretor_comercial',
    name: 'Diretor Comercial',
    email: 'diretor.comercial@sindroupas.local',
    default_password: resolvePassword('diretor_comercial', 'DiretorComercial@123')
  },
  {
    profile_code: 'vice_presidente',
    name: 'Vice-Presidente',
    email: 'vice.presidente@sindroupas.local',
    default_password: resolvePassword('vice_presidente', 'VicePresidente@123')
  },
  {
    profile_code: 'dir_evento_treinamento',
    name: 'Dir. Evento e Treinamento',
    email: 'dir.evento.treinamento@sindroupas.local',
    default_password: resolvePassword('dir_evento_treinamento', 'DirEventoTreinamento@123')
  },
  {
    profile_code: 'dir_inovacao_esg',
    name: 'Dir. Inovação e ESG',
    email: 'dir.inovacao.esg@sindroupas.local',
    default_password: resolvePassword('dir_inovacao_esg', 'DirInovacaoESG@123')
  },
  {
    profile_code: 'dir_financeiro',
    name: 'Dir. Financeiro',
    email: 'dir.financeiro@sindroupas.local',
    default_password: resolvePassword('dir_financeiro', 'DirFinanceiro@123')
  },
  {
    profile_code: 'coordenacao_executiva',
    name: 'Coordenação Executiva',
    email: 'coordenacao.executiva@sindroupas.local',
    default_password: resolvePassword('coordenacao_executiva', 'CoordenacaoExecutiva@123')
  }
];

export const bootstrapDefaultAppUsers = async (): Promise<AppUserBootstrapResult> => {
  const result: AppUserBootstrapResult = { created: [], skipped: [] };

  for (const appUser of DEFAULT_APP_USERS) {
    if (appUser.profile_code === 'admin') {
      result.skipped.push({ email: appUser.email, reason: 'invalid_profile' });
      continue;
    }

    const profileResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM app_profiles
       WHERE code = $1
       LIMIT 1`,
      [appUser.profile_code]
    );

    const profileId = profileResult.rows[0]?.id;

    if (!profileId) {
      result.skipped.push({ email: appUser.email, reason: 'profile_not_found' });
      continue;
    }

    const existingUserResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM app_users
       WHERE lower(email) = lower($1)
          OR profile_id = $2
       LIMIT 1`,
      [appUser.email, profileId]
    );

    if (existingUserResult.rows[0]) {
      result.skipped.push({ email: appUser.email, reason: 'already_exists' });
      continue;
    }

    const passwordHash = await hashPassword(appUser.default_password);

    await pool.query(
      `INSERT INTO app_users (email, password_hash, name, profile_id, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [appUser.email, passwordHash, appUser.name, profileId]
    );

    result.created.push({ email: appUser.email, profile_code: appUser.profile_code });
  }

  return result;
};
