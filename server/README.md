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
