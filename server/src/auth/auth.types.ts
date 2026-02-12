export type AdminRole = 'admin' | 'superadmin';
export type AdminStatus = 'active' | 'blocked';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  status: AdminStatus;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  scopes?: string[];
}
