import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { env } from '../config/env';
import { IntegrationError, mapEfiError } from './efi.errors';
import { EfiTokenResponse } from './efi.types';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface HttpJsonResponse {
  statusCode: number;
  body: unknown;
}

const withPath = (baseUrl: string, path: string): string => {
  const base = baseUrl.replace(/\/$/, '');
  const baseWithVersion = /\/v\d+$/i.test(base) ? base : `${base}/v1`;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseWithVersion}${normalizedPath}`;
};

const getCandidateBaseUrls = (baseUrl: string): string[] => {
  const base = baseUrl.trim().replace(/\/$/, '');
  const candidates = [base];

  if (base.includes('apis.gerencianet.com.br') || base.includes('api.gerencianet.com.br')) {
    candidates.push('https://cobrancas.api.efipay.com.br/v1');
    candidates.push('https://cobrancas-h.api.efipay.com.br/v1');
  }

  if (base.includes('apis.efipay.com.br')) {
    candidates.push('https://cobrancas.api.efipay.com.br/v1');
  }

  return Array.from(new Set(candidates));
};

const requestJson = (
  urlString: string,
  method: 'GET' | 'POST' | 'PUT',
  headers: Record<string, string>,
  timeoutMs: number,
  body?: unknown,
  certConfig?: { pfx: Buffer; passphrase?: string }
): Promise<HttpJsonResponse> => {
  const url = new URL(urlString);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;

  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          ...headers,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {})
        },
        ...(isHttps
          ? {
              pfx: certConfig?.pfx,
              passphrase: certConfig?.passphrase
            }
          : {})
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          raw += chunk;
        });

        res.on('end', () => {
          const statusCode = res.statusCode ?? 500;

          if (!raw) {
            resolve({ statusCode, body: {} });
            return;
          }

          try {
            resolve({ statusCode, body: JSON.parse(raw) });
          } catch (error) {
            resolve({ statusCode, body: { raw } });
          }
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
};

export class EfiClient {
  private tokenCache: TokenCache | null = null;
  private certConfig: { pfx: Buffer; passphrase?: string } | null = null;
  private resolvedBaseUrl: string | null = null;

  private getCertConfig(): { pfx: Buffer; passphrase?: string } | undefined {
    if (!env.efiCertPath) {
      return undefined;
    }

    if (this.certConfig) {
      return this.certConfig;
    }

    const pfx = fs.readFileSync(env.efiCertPath);
    this.certConfig = {
      pfx,
      passphrase: env.efiCertPass
    };

    return this.certConfig;
  }

  private async requestTokenWithPath(baseUrl: string, path: '/authorize' | '/oauth/token'): Promise<EfiTokenResponse> {
    const basicAuth = Buffer.from(`${env.efiClientId}:${env.efiClientSecret}`).toString('base64');

    const { statusCode, body } = await requestJson(
      withPath(baseUrl, path),
      'POST',
      {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      env.efiTimeoutMs,
      { grant_type: 'client_credentials' },
      this.getCertConfig()
    );

    if (statusCode < 200 || statusCode >= 300) {
      throw mapEfiError(statusCode, body);
    }

    const token = body as EfiTokenResponse;
    if (!token.access_token || !token.expires_in) {
      throw new IntegrationError(502, 'EFI_INVALID_TOKEN_RESPONSE', 'Resposta de token EFI inválida.', body);
    }

    return token;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 15_000) {
      return this.tokenCache.accessToken;
    }

    const candidateBaseUrls = this.resolvedBaseUrl
      ? [this.resolvedBaseUrl]
      : getCandidateBaseUrls(env.efiBaseUrl);

    let lastError: unknown;

    for (const baseUrl of candidateBaseUrls) {
      try {
        let token: EfiTokenResponse;

        try {
          token = await this.requestTokenWithPath(baseUrl, '/authorize');
        } catch (primaryError) {
          if (primaryError instanceof IntegrationError && [404, 400, 502].includes(primaryError.statusCode)) {
            token = await this.requestTokenWithPath(baseUrl, '/oauth/token');
          } else {
            throw primaryError;
          }
        }

        const expiresInMs = Math.max(30, token.expires_in) * 1000;
        this.tokenCache = {
          accessToken: token.access_token,
          expiresAt: now + expiresInMs
        };
        this.resolvedBaseUrl = baseUrl;

        return token.access_token;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof IntegrationError) {
      throw new IntegrationError(lastError.statusCode, lastError.code, lastError.message, {
        ...(typeof lastError.details === 'object' && lastError.details ? lastError.details : {}),
        candidateBaseUrls
      });
    }

    const message = lastError instanceof Error ? lastError.message : 'unknown_error';
    throw new IntegrationError(502, 'EFI_AUTH_CONNECTION_ERROR', 'Erro ao autenticar na EFI.', {
      reason: message,
      certPathConfigured: Boolean(env.efiCertPath),
      baseUrl: env.efiBaseUrl,
      candidateBaseUrls
    });
  }

  private getRequestBaseUrl(): string {
    return this.resolvedBaseUrl ?? env.efiBaseUrl;
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const baseUrl = this.getRequestBaseUrl();

    try {
      const { statusCode, body: responseBody } = await requestJson(
        withPath(baseUrl, path),
        method,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        env.efiTimeoutMs,
        body,
        this.getCertConfig()
      );

      if (statusCode < 200 || statusCode >= 300) {
        throw mapEfiError(statusCode, responseBody);
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'unknown_error';

      if (message.toLowerCase().includes('timeout')) {
        throw new IntegrationError(504, 'EFI_TIMEOUT', 'Timeout na integração com a EFI.');
      }

      throw new IntegrationError(502, 'EFI_UPSTREAM_ERROR', 'Erro de comunicação com a EFI.', {
        reason: message,
        certPathConfigured: Boolean(env.efiCertPath),
        baseUrl,
        requestedPath: path
      });
    }
  }

  async charge(payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/charge', 'POST', payload);
  }

  async billet(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/billet`, 'PUT', payload);
  }

  async getCharge(chargeId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}`, 'GET');
  }

  async cancel(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/cancel`, 'PUT', payload);
  }

  async resend(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/billet/resend`, 'POST', payload);
  }

  async history(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/history`, 'POST', payload);
  }

  async pay(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/pay`, 'POST', payload);
  }

  async settle(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/charge/${chargeId}/settle`, 'PUT', payload);
  }
}

export const efiClient = new EfiClient();
