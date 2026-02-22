# SaaS CRM WhatsApp – Multi-Tenant MVP

Sistema CRM para WhatsApp multi-tenant, pronto para produção, com arquitetura escalável.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Zustand, React Query
- **Backend:** Node.js, NestJS, Prisma, PostgreSQL
- **Real-time:** Socket.io
- **Infra:** Redis (fila + cache), Docker, Evolution API

## Requisitos

- Node.js 20+
- Docker e Docker Compose (para deploy completo)
- PostgreSQL 16 e Redis 7 (local ou Docker)

## Desenvolvimento local

### 1. Banco e Redis

```bash
docker run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=saas_whatsapp -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Ou use apenas os serviços do `docker-compose`:

```bash
docker-compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App em `http://localhost:3000`.

### 4. Evolution API (opcional, para WhatsApp)

```bash
docker run -d --name evolution-api -p 8080:8080 \
  -e WEBHOOK_GLOBAL_URL=http://host.docker.internal:3001/webhook \
  -e WEBHOOK_GLOBAL_ENABLED=true \
  -e WEBHOOK_EVENTS_MESSAGES_UPSERT=true \
  -e WEBHOOK_EVENTS_CONNECTION_UPDATE=true \
  atendai/evolution-api:latest
```

Configure o webhook da instância para `http://SEU_HOST:3001/webhook/messages-upsert`.

## Seed (login demo)

Após `npx prisma db seed`:

- **Empresa:** slug `demo`
- **Login:** `owner@demo.com` / `123456`
- **Funnel padrão:** Novo → Qualificando → Proposta → Fechado

## Deploy com Docker

```bash
# Build e sobe todos os serviços
docker-compose up -d --build

# Aplicar migrações (rodado automaticamente pelo backend)
# Seed manual se precisar:
docker-compose exec backend npx prisma db seed
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001  
- Evolution API: http://localhost:8080  

## Estrutura

```
backend/src/
  modules/     auth, companies, users, contacts, tickets, messages, funnels, whatsapp
  common/      guards, decorators, interceptors, filters
  prisma/      schema e service

frontend/
  app/         (auth), (dashboard) com App Router
  components/  UI (Shadcn) e chat
  stores/      Zustand (auth, chat)
  services/    API e auth
  hooks/      useSocket
```

## Multi-tenancy

- Todas as tabelas possuem `companyId`.
- Todas as queries são filtradas por `companyId` (via contexto do JWT).
- Nenhuma rota acessa dados de outra empresa; o guard injeta `companyId` no request.

## Licença

Proprietário – uso interno/comercial conforme definido pelo titular do repositório.
