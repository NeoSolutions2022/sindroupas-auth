import { BridgeBoleto } from './efi.types';

const mapStatusToUi = (statusRaw: string): string => {
  const normalized = statusRaw.toLowerCase();

  if (['waiting', 'new', 'unpaid'].includes(normalized)) {
    return 'Pendente';
  }

  if (['paid', 'settled'].includes(normalized)) {
    return 'Pago';
  }

  if (['canceled', 'cancelled'].includes(normalized)) {
    return 'Cancelado';
  }

  if (['overdue', 'expired'].includes(normalized)) {
    return 'Vencido';
  }

  return 'Em aberto';
};

const pick = (data: Record<string, unknown>, key: string): unknown => {
  return data[key];
};

export const normalizeEfiCharge = (raw: Record<string, unknown>): BridgeBoleto => {
  const statusRaw = String(
    pick(raw, 'status') ?? pick(raw, 'status_efi') ?? pick(raw, 'status_raw') ?? 'unknown'
  );

  const chargeId = String(pick(raw, 'charge_id') ?? pick(raw, 'chargeId') ?? pick(raw, 'id') ?? '');

  const valueRaw = pick(raw, 'value') ?? pick(raw, 'total') ?? null;
  const value = typeof valueRaw === 'number' ? valueRaw : valueRaw ? Number(valueRaw) : null;

  return {
    efi_charge_id: chargeId,
    status_efi_raw: statusRaw,
    status_ui: mapStatusToUi(statusRaw),
    valor: Number.isNaN(value) ? null : value,
    vencimento: (pick(raw, 'expire_at') ?? pick(raw, 'due_date') ?? null) as string | null,
    linha_digitavel: (pick(raw, 'barcode') ?? pick(raw, 'linha_digitavel') ?? null) as string | null,
    pdf_url: (pick(raw, 'pdf') ?? pick(raw, 'pdf_url') ?? null) as string | null,
    link_boleto: (pick(raw, 'link') ?? pick(raw, 'link_boleto') ?? null) as string | null,
    last_synced_at: new Date().toISOString()
  };
};
