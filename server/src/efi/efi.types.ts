export type BoletoTipo = 'mensalidade' | 'contribuicao';

export type BoletoAcao =
  | 'cancelar'
  | 'reenviar_boleto'
  | 'historico'
  | 'registrar_pagamento'
  | 'baixar_manual';

export interface BoletoCreateBody {
  tipo: BoletoTipo;
  empresaId?: string;
  empresaNome?: string;
  competenciaInicial?: string;
  competenciaFinal?: string;
  dataVencimento: string;
  faixaId?: string;
  unificarCompetencias?: string;
  mensagemPersonalizada?: string;
  anoContribuicao?: string;
  periodicidade?: string;
  parcelas?: string;
  baseCalculo?: string;
  percentual?: string;
  descontos?: string;
  valorCalculado: number;
  pesquisaContribuicaoFeita?: boolean;
}

export interface BoletoActionBody {
  acao: BoletoAcao;
  contexto?: {
    canal?: string;
    requestId?: string;
    usuarioId?: string;
  };
  payload?: Record<string, unknown>;
}

export interface BoletoSyncBody {
  items: Array<{
    efiChargeId: string;
    empresaId?: string;
  }>;
  force?: boolean;
  motivo?: 'backfill-manual' | 'reconciliacao' | 'acao-usuario' | string;
}

export interface BridgeBoleto {
  efi_charge_id: string;
  status_efi_raw: string;
  status_ui: string;
  valor: number | null;
  vencimento: string | null;
  linha_digitavel: string | null;
  pdf_url: string | null;
  link_boleto: string | null;
  last_synced_at: string;
}

export interface BridgeResponse {
  ok: true;
  acao:
    | 'criar'
    | 'consultar'
    | 'cancelar'
    | 'reenviar_boleto'
    | 'historico'
    | 'registrar_pagamento'
    | 'baixar_manual'
    | 'sync';
  boleto?: BridgeBoleto;
  boletos?: BridgeBoleto[];
  raw: unknown;
  requestId: string;
}

export interface EfiChargeResponse {
  code: number;
  data: Record<string, unknown>;
}

export interface EfiTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
}
