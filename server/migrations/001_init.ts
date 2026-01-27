import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createType('admin_user_role', ['superadmin', 'admin'], { ifNotExists: true });
  pgm.createType('admin_user_status', ['active', 'blocked'], { ifNotExists: true });
  pgm.createType('financeiro_boleto_status', ['emitido', 'pago', 'atrasado', 'cancelado'], { ifNotExists: true });
  pgm.createType('financeiro_export_tipo', ['pdf', 'excel', 'csv'], { ifNotExists: true });
  pgm.createType('financeiro_export_status', ['pendente', 'processando', 'concluido', 'erro'], { ifNotExists: true });
  pgm.createType('relacionamento_tipo', ['parceiro', 'mantenedor', 'fornecedor'], { ifNotExists: true });

  pgm.createTable('admin_users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    name: { type: 'text' },
    role: { type: 'admin_user_role', notNull: true, default: 'admin' },
    status: { type: 'admin_user_status', notNull: true, default: 'active' },
    mfa_secret: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('faixas', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    label: { type: 'text' },
    min_colaboradores: { type: 'integer' },
    max_colaboradores: { type: 'integer' },
    valor_mensalidade: { type: 'numeric' }
  });

  pgm.createTable('empresas', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    razao_social: { type: 'text' },
    nome_fantasia: { type: 'text' },
    cnpj: { type: 'text' },
    porte: { type: 'text' },
    capital_social: { type: 'numeric' },
    faixa_id: {
      type: 'uuid',
      references: 'faixas',
      onDelete: 'set null'
    },
    associada: { type: 'boolean' },
    situacao_financeira: { type: 'text' },
    data_fundacao: { type: 'date' },
    data_associacao: { type: 'date' },
    data_desassociacao: { type: 'date' },
    email: { type: 'text' },
    whatsapp: { type: 'text' },
    endereco: { type: 'text' },
    logo_url: { type: 'text' },
    observacoes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('responsaveis', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    empresa_id: {
      type: 'uuid',
      references: 'empresas',
      onDelete: 'cascade'
    },
    nome: { type: 'text' },
    whatsapp: { type: 'text' },
    email: { type: 'text' },
    data_aniversario: { type: 'date' }
  });

  pgm.createTable('colaboradores', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    empresa_id: {
      type: 'uuid',
      references: 'empresas',
      onDelete: 'cascade'
    },
    nome: { type: 'text' },
    cpf: { type: 'text' },
    whatsapp: { type: 'text' },
    cargo: { type: 'text' },
    email: { type: 'text' },
    observacoes: { type: 'text' }
  });

  pgm.createTable('financeiro_boletos', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    empresa_id: {
      type: 'uuid',
      references: 'empresas',
      onDelete: 'cascade'
    },
    tipo: { type: 'text' },
    valor: { type: 'numeric' },
    vencimento: { type: 'date' },
    status: { type: 'financeiro_boleto_status' },
    competencia_inicial: { type: 'date' },
    competencia_final: { type: 'date' },
    faixa_id: {
      type: 'uuid',
      references: 'faixas',
      onDelete: 'set null'
    },
    descricao: { type: 'text' },
    linha_digitavel: { type: 'text' },
    pdf_url: { type: 'text' },
    efi_charge_id: { type: 'text' },
    efi_status: { type: 'text' },
    efi_barcode: { type: 'text' },
    efi_pix_txid: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('contribuicoes_assistenciais', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    empresa_id: {
      type: 'uuid',
      references: 'empresas',
      onDelete: 'cascade'
    },
    ano: { type: 'integer' },
    periodicidade: { type: 'text' },
    parcelas: { type: 'integer' },
    base_calculo: { type: 'numeric' },
    percentual: { type: 'numeric' },
    descontos: { type: 'numeric' },
    valor_total: { type: 'numeric' },
    vencimento: { type: 'date' },
    situacao: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('financeiro_export_jobs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    admin_id: {
      type: 'uuid',
      references: 'admin_users',
      onDelete: 'set null'
    },
    tipo: { type: 'financeiro_export_tipo' },
    filtro: { type: 'jsonb' },
    status: { type: 'financeiro_export_status' },
    resultado_url: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('relacionamentos', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tipo: { type: 'relacionamento_tipo' },
    nome: { type: 'text' },
    cnpj: { type: 'text' },
    categoria: { type: 'text' },
    status: { type: 'text' },
    descricao: { type: 'text' },
    ultima_mov: { type: 'date' },
    contrapartidas: { type: 'text' },
    observacoes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('relacionamento_contatos', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    relacionamento_id: {
      type: 'uuid',
      references: 'relacionamentos',
      onDelete: 'cascade'
    },
    email: { type: 'text' },
    whatsapp: { type: 'text' },
    nome: { type: 'text' }
  });

  pgm.createTable('relacionamento_aportes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    relacionamento_id: {
      type: 'uuid',
      references: 'relacionamentos',
      onDelete: 'cascade'
    },
    valor: { type: 'numeric' },
    data: { type: 'date' },
    descricao: { type: 'text' }
  });

  pgm.createTable('relacionamento_pagamentos', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    relacionamento_id: {
      type: 'uuid',
      references: 'relacionamentos',
      onDelete: 'cascade'
    },
    valor: { type: 'numeric' },
    data: { type: 'date' },
    descricao: { type: 'text' }
  });

  pgm.createTable('files', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    owner_type: { type: 'text' },
    owner_id: { type: 'uuid' },
    file_url: { type: 'text' },
    content_type: { type: 'text' },
    metadata: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.addIndex('empresas', 'cnpj', { unique: true });
  pgm.addIndex('empresas', 'faixa_id');
  pgm.addIndex('responsaveis', 'empresa_id');
  pgm.addIndex('colaboradores', 'empresa_id');
  pgm.addIndex('colaboradores', 'cpf');
  pgm.addIndex('financeiro_boletos', 'empresa_id');
  pgm.addIndex('financeiro_boletos', 'status');
  pgm.addIndex('financeiro_boletos', 'vencimento');
  pgm.addIndex('financeiro_boletos', 'efi_charge_id');
  pgm.addIndex('contribuicoes_assistenciais', 'empresa_id');
  pgm.addIndex('financeiro_export_jobs', 'admin_id');
  pgm.addIndex('relacionamentos', 'tipo');
  pgm.addIndex('relacionamento_contatos', 'relacionamento_id');
  pgm.addIndex('relacionamento_aportes', 'relacionamento_id');
  pgm.addIndex('relacionamento_pagamentos', 'relacionamento_id');
  pgm.addIndex('files', ['owner_type', 'owner_id']);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('files');
  pgm.dropTable('relacionamento_pagamentos');
  pgm.dropTable('relacionamento_aportes');
  pgm.dropTable('relacionamento_contatos');
  pgm.dropTable('relacionamentos');
  pgm.dropTable('financeiro_export_jobs');
  pgm.dropTable('contribuicoes_assistenciais');
  pgm.dropTable('financeiro_boletos');
  pgm.dropTable('colaboradores');
  pgm.dropTable('responsaveis');
  pgm.dropTable('empresas');
  pgm.dropTable('faixas');
  pgm.dropTable('admin_users');

  pgm.dropType('relacionamento_tipo');
  pgm.dropType('financeiro_export_status');
  pgm.dropType('financeiro_export_tipo');
  pgm.dropType('financeiro_boleto_status');
  pgm.dropType('admin_user_status');
  pgm.dropType('admin_user_role');
};
