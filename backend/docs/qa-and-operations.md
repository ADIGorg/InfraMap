# QA, CI, execução e operações — InfraMap Backend

## Requisitos

- Node.js >=22.12, npm, Git, VS Code opcional.
- Docker Desktop em modo Linux (Windows usa WSL2) para Supabase local.
- `npm ci` dentro da pasta `backend` (trabalhe na branch de correção).
- `backend/.env` privado para execução normal; **não commitar** valores secretos.

## Scripts executáveis

| Script | Execução |
|---|---|
| `npm run dev` | `tsx watch` em `src/server.ts` |
| `npm run build` | `tsc`, saída em `dist` |
| `npm run lint` | ESLint |
| `npm test` | Vitest geral, sem habilitar integrações reais |
| `npm run test:unit` | QA-01: casos de uso, validação, segurança |
| `npm run test:integration` | Rotas Express com mocks; não prova banco real |
| `npm run test:db` | QA-02: pgTAP no PostgreSQL local (225 asserts) |
| `npm run test:db-integration` | QA-02: Supabase Auth/RLS/Storage reais **LOCAL** |
| `npm run test:e2e` | QA-03: jornadas API/Supabase completas **LOCAL** |
| `npm run test:qa` | Build, lint, QA-01/HTTP/SQL/integração/E2E sequenciais |

## Comandos passo a passo (Windows PowerShell / VS Code)

```powershell
git fetch origin
git switch fix/qa-supabase-security-and-backend-docs-20261114
cd backend
npm ci
npm run build
npm run lint
npm run test:unit
npm run test:integration
```

Em seguida abra o Docker Desktop, confirme `docker info`, inicie o Supabase local:

```powershell
npx supabase start --exclude studio,mailpit,logflare,vector,imgproxy,edge-runtime
npx supabase status
```

Caso o banco local já esteja iniciado com migrations antigas, para aplicar a **nova migration** use primeiro `npx supabase db reset` **somente local**, ciente de que remove todos os dados locais de desenvolvimento. Um projeto recém-iniciado aplica as migrations automaticamente; caso a migration tenha sido adicionada depois do start, o reset reproduz a cadeia completa.

Coloque no mesmo PowerShell, substituindo as credenciais pelas da seção **Authentication Keys** do `npx supabase status`, e não pelas do Supabase remoto nem pelas de Storage (S3):

```powershell
$env:NODE_ENV = "test"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY = "<PUBLISHABLE_LOCAL>"
$env:SUPABASE_SECRET_KEY = "<SECRET_LOCAL>"
$env:AI_PROVIDER = "mock"
$env:EMAIL_PROVIDER = "mock"
```

Validar sem exibir segredos:

```powershell
$env:SUPABASE_URL
[bool]$env:SUPABASE_PUBLISHABLE_KEY
[bool]$env:SUPABASE_SECRET_KEY
```

Executar:

```powershell
npm run test:db
npm run test:db-integration
npm run test:e2e
# Ou em uma única verificação (com Supabase iniciado):
npm run test:qa
```

Encerrar: `npx supabase stop`. O terminal PowerShell mantém variáveis `$env:` até encerrar a sessão. Uma nova sessão exige exportá-las novamente. `dotenv/config` respeita as variáveis de processo já definidas.

## O que cada suíte cobre

**QA-01**: 195+ casos de uso, moderação, IA, perfil, votos, fotos, regras inválidas, factory de email e middlewares.

**Integração HTTP (mocks)**: 70+ testes de Express/rotas, Auth simulada, CORS/Helmet, Zod, erros HTTP, perfis, dashboard, categorias. Testes de Supabase E2E são ignorados por padrão.

**QA-02 SQL**: 7 suítes pgTAP (225 assertivas): tabelas/ENUMs/FKs/UNIQUE/índices, privilégios RLS, perfis/MASTER, lifecycle da IA, transições, votos, notificações, histórico, encaminhamentos, segurança de foto oculta, desativação e SLA. Criam fixtures fictícias e usam transações `BEGIN...ROLLBACK`.

**QA-02 real**: `tests/integration/supabase/storage-rls.real.spec.ts`, verifica Auth, ADMIN/MASTER, storage privado, RLS de ocorrência/fotos e isolamento de notificações.

**QA-03 E2E**: `tests/e2e/citizen-moderation.e2e.spec.ts` e `tests/e2e/administration-forwarding.e2e.spec.ts`: cadastro → fotografia → análise IA mock → finalização → moderação → voto → notificação → atendimento → resolução/rejeição, admins/órgãos e encaminhamento.

`tests/support/qa-local-supabase.ts` impede **escritas em host Supabase remoto**. Não remover esse guard para fazer um teste passar; para staging remoto deve existir outra harness com opt-in explícito e allowlist.

## GitHub Actions

Workflow `.github/workflows/qa-sprint2.yml`:
- Job `typescript`: Node 22, `npm ci`, build, lint, unitários e integração HTTP.
- Job `database-and-e2e`: Supabase local descartável; executa pgTAP, integração real e E2E isoladamente, depois para Docker; status agregado fica vermelho se qualquer etapa falhar.
- CLI Supabase vem da dependência npm do repositório (evita rate limit do download de releases).
- `concurrency` cancela runs anteriores na mesma branch. Falhas de pull Docker/porta ocupada têm de ser diferenciadas de falhas da aplicação. Não interpretar job que falhou no start como prova do resultado do banco.

## Erros encontrados anteriormente e o que corrigimos

| Falha original | Raiz | Correção da branch |
|---|---|---|
| 42501 SELECT `occurrences` para admin | Migration revogava `SELECT authenticated` | Novo GRANT + policy RLS own/admin |
| 42601 em prioridade | `RETURN (SELECT * ...)` em função que retorna registro | Retorno de row PL/pgSQL |
| 42601 em visibilidade | Mesmo erro | Retorno de row PL/pgSQL |
| Foto oculta pública | Helper ignorava `public_visible` | Helper/RLS e verificação HTTP |
| Histórico interno exposto | Policy e RPC não filtravam evento interno | Policy + RPC filtradas |
| `anon` executa forwarding | Grants amplos | REVOKE explicitamente para anon/PUBLIC |
| 401 em GET público de contagem de votos | `router.use(authenticate)` em router de histórico montado antes do voto | Autenticar apenas rota `/:id/history` |
| Fotos vazias no detalhe público | Mapper retornava `photos: []` | Backend lê metadados somente após view segura e gera URLs assinadas |

## Como diagnosticar erro sem expor credenciais

- `MODERATION_LOOKUP_FAILED` com SQLSTATE `42501`: conferir GRANT e policy (não apenas middleware).
- `42601 subquery must return only one column`: verificar body da RPC, tipos de retorno.
- HTTP 401 em endpoint supostamente público: conferir ordem de `routes.use` e escopo de `router.use(authenticate)`.
- Fotos inacessíveis: verificar bucket, paths, ownership, `public_visible`, signed URL e expiry.
- `docker API pipe not found` no Windows: iniciar Docker Desktop, `docker info`.
- `supabase_analytics_backend unhealthy`: iniciar supabase com `--exclude logflare,vector,...`.
- Falha em `supabase start` no GitHub Actions: checar pull rate-limit, porta, Docker; não é automaticamente erro SQL.
- Em qualquer log, ocultar publishable/secret/service_role/S3 keys, tokens, senhas e JWT.

## Checklist para PR

- [ ] Build e lint limpos; `main` não alterada diretamente.
- [ ] QA-01/HTTP mocks, 225 pgTAP, Auth/Storage e QA-03 aprovados no mesmo commit.
- [ ] Tests negativos e de privacidade continuam ativos.
- [ ] Nova migration não modificou migrations históricas.
- [ ] OpenAPI + arquitetura + módulos + runbook atualizados.
- [ ] Nenhum dado real foi copiado para staging/local.
- [ ] Pipeline de produção separado do pipeline QA e requer aprovação.

Outros guias: [Supabase por ambiente](supabase-environments.md), [Banco/RLS](database-and-security.md), [Limitações](known-limitations.md).
