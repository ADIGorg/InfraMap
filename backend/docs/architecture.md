# Arquitetura real do backend InfraMap

## Visão e componentes

O backend é um **monólito modular REST** em Node.js >=22.12, Express 5, TypeScript NodeNext (imports internos com sufixo `.js`), Zod, Vitest/Supertest e Supabase (Postgres/PostGIS, Auth, Storage, Realtime). O código-fonte fica em `backend/src`; `dist` é artefato de build.

O desenho é **camadas com DDD seletivo**: módulos complexos usam `domain` (contratos), `application/use-cases` (orquestração), `infrastructure` (concretos) e `presentation` (Express/DTO Zod). `health` e `categories` são menores e não precisam de scaffolding artificial.

### Árvore de responsabilidades

```text
backend/
  src/
    config/          env.ts, constants.ts
    infrastructure/
      supabase/      auth/public/admin/client factory com JWT
      storage/       signed URLs e Storage de fotos
      ai/            provider mock/http com Strategy + Factory
      email/         provider mock/http com Strategy + Factory
    modules/
      identity/      perfil próprio, papéis, desativação, admin-check
      categories/    CAT01..CAT07
      ai-analysis/   upload, PENDING/PROCESSING/COMPLETED/CONSUMED/FAILED
      occurrences/   cadastro, consultas, histórico, acesso a fotos
      moderation/    transições, prioridade, local, classificação, observações
      votes/         voto único e contagem pública
      notifications/ notificações do cidadão
      forwardings/   encaminhamento para órgãos e resultado e-mail
      administration/gestão MASTER, órgãos e dashboard
      health/        liveness
    shared/          middlewares, erros, logging, tipos Express
    routes/          agregação de routers, composição por requisição
    app.ts           Express, Helmet/CORS/limites/404/errors
    server.ts        HTTP listener
  supabase/
    migrations/      SQL incremental e auditável (NUNCA editar já aplicada)
    seed.sql         dados locais/sintéticos
    tests/database/  pgTAP — regras, RLS, RPC, banco
  tests/
    unit/            regras sem banco (Vitest)
    integration/     HTTP mocks; supabase/ com DB/Auth/Storage reais locais
    e2e/             jornadas completas API + Supabase local
    support/         fixtures restritas ao host local
  docs/              arquitetura, API, dados, ambientes e operação
  package.json       scripts oficiais
```

### Fluxo HTTP

1. Cliente mobile envia solicitação à API Express sob `/api/v1`.
2. `requestLogger`, Helmet, CORS, restrição de método, rate limit e JSON parser são aplicados em `app.ts`.
3. Router do módulo valida `params`, `query` e `body` via Zod; rotas protegidas usam `authenticate` e `authorizeRole`.
4. `authenticate` valida JWT no Supabase Auth e define `req.user`/`req.token`.
5. Controller cria caso de uso e repositório associado ao **JWT do solicitante**, ou cliente `service_role` somente quando indispensável.
6. Use case valida domínio; repositório chama view, RPC ou tabela. PostgreSQL confirma RLS e constraints; RPC `SECURITY DEFINER` sempre valida identidade e estado.
7. `errorHandler` traduz exceções em resposta JSON sem divulgar segredos.

Padrões existentes: Repository, Use Case, Factory/Strategy para IA e e-mail, validação de entrada via schemas/DTOs; programação orientada a interfaces nos módulos maduros. Não é DDD integral e não se deve alegar que todo módulo já o utiliza.

### Fronteiras de segurança

| Cliente | Propósito | Quem usa |
|---|---|---|
| Public/Publishable | Categorias, lista/detalhe público de ocorrências e agregados | Backend sem JWT |
| User + JWT | Perfil, ocorrência própria, moderação por ADMIN, voto, histórico | Backend por requisição |
| Admin/Secret (service_role) | Gestão de Auth, upload e movimentação de fotos, signed URLs, operações administrativas estritas | **Somente servidor** |

RLS controla tabela privada; `GRANT` controla privilégio de comando; ambos são necessários. Repositórios e RPCs precisam respeitar os mesmos invariantes. A view pública deve expor somente localização aproximada; `occurrences` não tem `SELECT` para `anon`. A policy `authenticated` dá leitura direta **apenas ao autor ou ADMIN ativo**; a listagem pública continua disponível pela projeção segura.

### Fotos/IA

- Envio 1–3 fotos PNG/JPEG (até 5 MiB por foto); caminho temporário privado no Storage.
- IA: provider `mock` em QA; `http` integra fornecedor externo HTTPS e requer URL/key/model. **Não existe adapter Gemini nativo nesta main**; usar proxy HTTP exige validação contratual separada.
- Quando `COMPLETED`, autor revisa classificação/descrição e finaliza a ocorrência via RPC SQL. Campos de proveniência registram confirmação/edição/manual.
- API gera signed URLs por tempo limitado; não retorna caminhos privados ao público. Fotos de ocorrências ocultas não podem ser acessadas por terceiros.
- **Limitação operacional pendente:** commit da ocorrência e movimentação física de fotos são serviços distintos e não fazem transação distribuída. Ver `known-limitations.md`.

### Moderação e domínio

```text
RECEIVED -> UNDER_ANALYSIS -> CONFIRMED -> IN_SERVICE -> RESOLVED
                         \\-> REJECTED
```

Só ADMIN ativo transiciona; CONFIRMED precisa de prioridade e ação concreta antes de IN_SERVICE; REJECTED exige justificativa. RESOLVED/REJECTED são terminais na implementação atual. Uma ocorrência confirmada pode ser exibida no mapa se `public_visible=true`; autor e admin continuam vendo suas próprias/administradas, mesmo ocultas.

### Princípios de alteração

- Definir contratos em `domain`; implementações do Supabase sempre em `infrastructure`. Não criar `supabase-*.repository.ts` dentro de `domain`.
- Nomes de arquivos: `kebab-case` + sufixos `.controller.ts`, `.routes.ts`, `.repository.ts`, `.use-case.ts`, `.schema.ts`.
- Migrations sempre incrementais e em ordem cronológica; SQL idempotente quando possível; não sobrescrever migrations históricas.
- API em `/api/v1`, OpenAPI em `docs/openapi.yaml`, scripts NodeNext e TypeScript strict.
- Modificações de Auth/RLS/Storage exigem QA de privilégio negativo, não só caminho de sucesso.

Outras referências: [Módulos e endpoints](modules-and-api.md), [Dados e segurança](database-and-security.md), [Ambientes](supabase-environments.md), [Testes e operação](qa-and-operations.md).
