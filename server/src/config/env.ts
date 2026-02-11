import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing env ${key}`);
  }
  return value;
};

const getOptionalEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  return value;
};

export const env = {
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('AUTH_JWT_SECRET'),
  jwtExpiresIn: getEnv('AUTH_JWT_EXPIRES_IN', '12h'),
  bcryptRounds: Number(getEnv('BCRYPT_ROUNDS', '12')),
  port: Number(getEnv('PORT', '3001')),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  corsOrigin: getEnv('CORS_ORIGIN', '*'),
  efiBaseUrl: getEnv('EFI_BASE_URL'),
  efiClientId: getEnv('EFI_CLIENT_ID'),
  efiClientSecret: getEnv('EFI_CLIENT_SECRET'),
  efiCertPath: getOptionalEnv('EFI_CERT_PATH'),
  efiCertPass: getOptionalEnv('EFI_CERT_PASS'),
  efiTimeoutMs: Number(getEnv('EFI_TIMEOUT_MS', '10000'))
};
