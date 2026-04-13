export type AdminRole = 'admin' | 'superadmin';
export type AdminStatus = 'active' | 'blocked';
export type AuthRole = 'admin' | 'user';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  status: AdminStatus;
}

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  profile_id: string;
  profile_code: string;
  is_active: boolean;
  created_at: string;
}

export interface AppUserListItem {
  id: string;
  email: string;
  name: string | null;
  profile_code: string;
  profile_label: string;
  is_active: boolean;
  created_at: string;
}

export interface AppProfile {
  id: string;
  code: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: AuthRole;
  user_id: string;
  profile_code: string;
  'x-hasura-default-role': AuthRole;
  'x-hasura-allowed-roles': AuthRole[];
  'x-hasura-user-id': string;
  'x-hasura-profile-code': string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-default-role': AuthRole;
    'x-hasura-allowed-roles': AuthRole[];
    'x-hasura-user-id': string;
    'x-hasura-profile-code': string;
  };
}
