# Módulos e endpoints HTTP — InfraMap API

**Base:** `/api/v1`. Fonte: `src/routes/index.routes.ts` e os arquivos `presentation/*.routes.ts`. Documentação de payloads: `docs/openapi.yaml`; se divergir dos schemas Zod/código, **o código executável é a referência para o comportamento vigente** e OpenAPI precisa ser ajustada.

## Mapa de módulos

| Módulo | Pasta | Serviço, regra e responsabilidade |
|---|---|---|
| health | `modules/health` | Liveness/health check |
| identity | `modules/identity` | Supabase Auth, identidade, perfil pessoal, desativação e limpeza Auth pendente |
| categories | `modules/categories` | CAT01–CAT07 ativas; consulta pública |
| ai-analysis | `modules/ai-analysis` | Upload de evidências, IA async, reprocessamento e consumo único |
| occurrences | `modules/occurrences` | Finalização, detalhes/listagens, imagens, localização e histórico |
| moderation | `modules/moderation` | ADMIN: análise, confirmação/rejeição, prioridade, atendimento, resolução e correções |
| votes | `modules/votes` | Voto único por cidadão, sem voto próprio e contagem pública |
| notifications | `modules/notifications` | Notificações privadas por destinatário, marcar leitura |
| administration | `modules/administration` | MASTER e OPERATIONAL: admins, órgãos, dashboard |
| forwardings | `modules/forwardings` | Encaminhamento para órgão, e-mail mock/http, audit trail e resultados |

## Endpoints principais

| Método e caminho (após /api/v1) | Perfil | Comportamento |
|---|---|---|
| GET `/health` | Público | Saúde da API |
| GET `/categories` | Público | Categorias disponíveis |
| GET `/identity/me` | Autenticado | Perfil próprio |
| PATCH `/identity/me` | Autenticado | Campos editáveis do perfil |
| DELETE `/identity/me` | Autenticado | Desativação/anonimização (idempotência definida no SQL) |
| GET `/identity/admin-check` | ADMIN | Verifica autorização |
| GET `/app/me` | CITIZEN | Identidade do cidadão ativo |
| GET `/admin/me` | ADMIN | Identidade do admin ativo |
| POST `/ai-analyses/` | CITIZEN | Multipart: campo `photos` (1–3 JPEG/PNG) |
| POST `/ai-analyses/:id/analyze` | CITIZEN | Dispara IA async e retorna 202 |
| GET `/ai-analyses/:id` | CITIZEN autor | Estado e resultado da análise |
| POST `/occurrences/finalize` | CITIZEN autor | Cria ocorrência a partir da IA COMPLETED |
| GET `/occurrences/mine` | Autenticado | Lista as ocorrências do autor |
| GET `/occurrences/mine/:id` | Autor | Detalhe pessoal |
| GET `/occurrences/public` | Público | Lista pública filtrada por status e visibilidade |
| GET `/occurrences/public/:id` | Público | Detalhe público + URLs temporárias de fotos |
| GET `/occurrences/public/:id/photos/:photoId` | Público | URL assinada somente CONFIRMED/IN_SERVICE + visível |
| GET `/occurrences/mine/:id/photos/:photoId` | Autor | URL assinada da própria evidência |
| GET `/admin/occurrences/:id/photos/:photoId` | ADMIN | Evidência para moderação |
| GET `/occurrences/:id/history` | Autor ou ADMIN | Histórico com eventos internos ocultos para autor |
| GET `/admin/occurrences` | ADMIN | Filtros, paginação e ordenação |
| GET `/admin/occurrences/:id` | ADMIN | Detalhes completos |
| PATCH `/admin/occurrences/:id/start-analysis` | ADMIN | RECEIVED → UNDER_ANALYSIS |
| POST `/admin/occurrences/:id/confirm` | ADMIN | UNDER_ANALYSIS → CONFIRMED |
| POST `/admin/occurrences/:id/reject` | ADMIN | UNDER_ANALYSIS → REJECTED, justificativa |
| PATCH `/admin/occurrences/:id/priority` | ADMIN | Define/atualiza LOW/MEDIUM/HIGH |
| POST `/admin/occurrences/:id/start-service` | ADMIN | CONFIRMED → IN_SERVICE, exige ação concreta e prioridade |
| POST `/admin/occurrences/:id/resolve` | ADMIN | IN_SERVICE → RESOLVED |
| POST `/admin/occurrences/:id/observations` | ADMIN | INTERNAL ou CITIZEN_RESPONSE |
| PATCH `/admin/occurrences/:id/location` | ADMIN | Ajuste preserva local original |
| PATCH `/admin/occurrences/:id/classification` | ADMIN | Correção de descrição/categoria auditada |
| GET `/occurrences/:id/votes` | Público | Contagem pública sem autenticação |
| POST `/occurrences/:id/votes` | CITIZEN | Votar, sujeito a autorização e duplicidade |
| DELETE `/occurrences/:id/votes/me` | CITIZEN | Remove voto do solicitante |
| GET `/notifications` | CITIZEN | Lista apenas notificações próprias |
| PATCH `/notifications/read-all` | CITIZEN | Marca todas as próprias notificações |
| PATCH `/notifications/:id/read` | CITIZEN | Marca uma notificação |
| GET `/admin/dashboard` | ADMIN | KPIs e prazos SLA |
| GET `/admin/admins` | MASTER | Lista administradores |
| POST `/admin/admins` | MASTER | Provisiona administrador |
| PATCH `/admin/admins/:id` | MASTER | Atualiza poderes/atividade |
| GET `/admin/agencies` | ADMIN | Lista órgãos |
| POST `/admin/agencies` | MASTER | Cria órgão |
| PATCH `/admin/agencies/:id` | MASTER | Atualiza órgão |
| GET `/admin/occurrences/:id/forwardings` | ADMIN | Encaminhamentos registrados |
| POST `/admin/occurrences/:id/forwardings` | ADMIN | Registra e envia ao órgão, sem mudar status da ocorrência |

A UI de documentação está sob `/api/docs`. As respostas de sucesso podem usar `{ data: ... }`; erro central usa `{ error: { code, message } }`.

## Regras de domínio resumidas

- **Usuário ativo**: `CITIZEN` ou `ADMIN`; `ADMIN` possui `MASTER` ou `OPERATIONAL` e deve estar ativo no banco. Nunca confie em role vindo do body do cliente.
- **Fotos**: 1–3; JPEG/PNG; até 5 MiB cada; bucket privado `occurrence-photos`; acesso público somente por signed URL curta e ocorrência visível.
- **IA**: PENDING → PROCESSING → COMPLETED/FAILED → CONSUMED após finalizar. Sugestões podem ser confirmadas/ajustadas pelo cidadão; fallback de categoria CAT07.
- **Ocorrência**: RECEIVED → UNDER_ANALYSIS → CONFIRMED → IN_SERVICE → RESOLVED, ou UNDER_ANALYSIS → REJECTED; estados finais sem transição de retorno neste backend.
- **Prioridade**: LOW/MEDIUM/HIGH; exige estado elegível e usuário ADMIN; operação RPC + histórico.
- **Voto**: autor não vota; usuário ativo, apenas ocorrência elegível, duplicatas rejeitadas, remoção pelo mesmo usuário.
- **Histórico**: ação interna não é conteúdo público; ADMIN pode ver observações internas e detalhes de auditoria.
- **Órgãos/forwardings**: encaminhar apenas CONFIRMED para órgão ativo; PENDING→SENT ou FAILED; resultado auditado; não altera status da ocorrência.
- **Dados geográficos**: localização original imutável; ajuste em campo separado; mapa público usa coordenadas aproximadas.

## Como adicionar uma funcionalidade

1. Definir regras/contratos com teste negativo.
2. Criar/estender use case e schema Zod, com DTO de resposta sem dados internos.
3. Criar/reutilizar interface `domain/repositories`; implementar Supabase em `infrastructure/repositories`.
4. Alterar `presentation` (route/controller) e adicionar à composição de rotas, checando ordem dos middlewares.
5. Se alterar DB, **nova** migration e testes pgTAP + RLS + Auth reais.
6. Atualizar OpenAPI, este documento, tests e QA CI; não alterar branch `main` sem PR/aprovação.

Referências: [Arquitetura](architecture.md), [Banco e RLS](database-and-security.md), [Testes/CI](qa-and-operations.md).
