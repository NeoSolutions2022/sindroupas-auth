# SindiRoupas Auth Module

## Configuração

1) Copie o `.env.example` para `.env` e preencha os valores:

```bash
cp .env.example .env
```

Campos obrigatórios:

- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `AUTH_JWT_EXPIRES_IN` (default 12h)
- `BCRYPT_ROUNDS` (default 12)
- `PORT` (default 3001)
- `NODE_ENV`

## Banco de dados

Crie as tabelas e faça o seed do admin padrão:

```bash
npm run db:setup
```

As migrations usam arquivos `.js` (CommonJS) para compatibilidade com o `node-pg-migrate`.

## Rodar o servidor

```bash
npm run dev
```

## Docker

Build da imagem:

```bash
docker build -t sindroupas-auth .
```

Rodar o container:

```bash
docker run --rm -p 3001:3001 --env-file .env sindroupas-auth
```

## Exemplos de curl

### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sindroupas@email.com","password":"admin123%"}'
```

### Me

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer <token>"
```

## Manual de integração (CRUD no front)

As tabelas abaixo são expostas pelo Hasura para CRUD. O front deve consumir o GraphQL gerado pelo Hasura (queries, mutations e subscriptions) usando os nomes das tabelas.

### Auth

- **admin_users**: usuários admins do sistema. Campos principais: `id`, `email`, `name`, `role`, `status`, `created_at`, `updated_at`.

### Empresas

- **faixas**: faixas de contribuição por quantidade de colaboradores e valor. Campos: `label`, `min_colaboradores`, `max_colaboradores`, `valor_mensalidade`.
- **empresas**: cadastro principal da empresa. Campos de identificação (`razao_social`, `cnpj`, `nome_fantasia`), vínculo (`faixa_id`, `associada`), dados administrativos e contatos.
- **responsaveis**: pessoas responsáveis por cada empresa (relacionamento por `empresa_id`).
- **colaboradores**: colaboradores ligados à empresa (relacionamento por `empresa_id`), com `cpf`, `cargo` e observações.

### Financeiro

- **financeiro_boletos**: boletos emitidos por empresa (relacionamento `empresa_id`), com status e competência.
- **contribuicoes_assistenciais**: registros de contribuições por empresa (`empresa_id`) com periodicidade, parcelas e valores.
- **financeiro_export_jobs**: filas de exportação para admins (`admin_id`) com `tipo`, `filtro` e `status`.

### Relacionamentos

- **relacionamentos**: cadastro de parceiros/mantenedores/fornecedores (campo `tipo`).
- **relacionamento_contatos**: contatos associados a um relacionamento (`relacionamento_id`).
- **relacionamento_aportes**: aportes registrados por relacionamento (`relacionamento_id`).
- **relacionamento_pagamentos**: pagamentos registrados por relacionamento (`relacionamento_id`).

### Arquivos

- **files**: anexos genéricos por `owner_type` e `owner_id` com `file_url`, `content_type` e `metadata`.
