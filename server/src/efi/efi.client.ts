import { env } from '../config/env';
import { IntegrationError, mapEfiError } from './efi.errors';
import { EfiTokenResponse } from './efi.types';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class EfiClient {
  private tokenCache: TokenCache | null = null;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 15_000) {
      return this.tokenCache.accessToken;
    }

    const basicAuth = Buffer.from(`${env.efiClientId}:${env.efiClientSecret}`).toString('base64');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.efiTimeoutMs);

    try {
      const response = await fetch(`${env.efiBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grant_type: 'client_credentials' }),
        signal: controller.signal
      });

      const body = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw mapEfiError(response.status, body);
      }

      const token = body as unknown as EfiTokenResponse;
      const expiresInMs = Math.max(30, token.expires_in) * 1000;
      this.tokenCache = {
        accessToken: token.access_token,
        expiresAt: now + expiresInMs
      };

      return token.access_token;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new IntegrationError(504, 'EFI_TIMEOUT', 'Timeout na integração com a EFI.');
      }

      throw new IntegrationError(502, 'EFI_UPSTREAM_ERROR', 'Erro ao autenticar na EFI.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.efiTimeoutMs);

    try {
      const response = await fetch(`${env.efiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      const json = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw mapEfiError(response.status, json);
      }

      return json as T;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new IntegrationError(504, 'EFI_TIMEOUT', 'Timeout na integração com a EFI.');
      }

      throw new IntegrationError(502, 'EFI_UPSTREAM_ERROR', 'Erro de comunicação com a EFI.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async charge(payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/v1/charge', 'POST', payload);
  }

  async billet(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/billet`, 'PUT', payload);
  }

  async getCharge(chargeId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}`, 'GET');
  }

  async cancel(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/cancel`, 'PUT', payload);
  }

  async resend(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/billet/resend`, 'POST', payload);
  }

  async history(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/history`, 'POST', payload);
  }

  async pay(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/pay`, 'POST', payload);
  }

  async settle(chargeId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/charge/${chargeId}/settle`, 'PUT', payload);
  }
}

export const efiClient = new EfiClient();
