# Testes de regras de negócio e banco — InfraMap

> Branch: `test/qa-01-02-03-sprint2-20261112`  
> Base: `main` de 12/11/2026. **Nenhuma migration de produção ou regra da aplicação foi modificada.**
>
> Referências normativas: `03 — BUSINESS RULES.md`, esquema do Anexo 2, migrations ativas e contratos existentes no GitHub.

## 1. Como executar no terminal do VS Code

Pré-requisitos: Node.js >= 22.12.0, npm, Docker Desktop aberto e espaço para as imagens do Supabase. **Executar na pasta `backend/`**.

```bash
git fetch origin
git switch test/qa-01-02-03-sprint2-20261112
cd backend
npm ci
npm run test:unit
npm run test:integration

# Banco local isolado — NÃO é o Supabase hospedado.
npx supabase start
npm run test:db
npm run test:e2e

# Tudo em sequência (Supabase já iniciado)
npm run test:all

# Ao terminar
npx supabase stop
```

O primeiro `supabase start` pode baixar diversas imagens Docker. Em Windows/PowerShell, os comandos acima funcionam no terminal do VS Code com Docker Desktop ativo. Caso a branch não esteja disponível localmente, use `git fetch origin` e `git switch --track origin/test/qa-01-02-03-sprint2-20261112`.

**Não rodar `supabase db reset --linked`, `supabase db push`, `supabase test db --remote` ou `migration repair` durante esta validação.** A suíte pgTAP foi criada para o banco local.

Os arquivos SQL usam `BEGIN`/`ROLLBACK` e usuários fictícios. A ferramenta CLI executa pgTAP no ambiente Supabase local. Em especial, as operações de Auth administrativas externas e envio real de e-mail não são chamadas nos testes SQL.

### Execução rápida

| Comando | Escopo |
|---|---|
| `npm test` | Todos os testes TypeScript (unitários + HTTP) |
| `npm run test:unit` | Somente casos de uso e regras de domínio |
| `npm run test:integration` | Rotas Express/middlewares com mocks, sem banco |
| `npm run test:db` | pgTAP no PostgreSQL local (requer `supabase start`) |
| `npm run test:e2e` | Fluxos reais Auth/API/Postgres/Storage com provider de IA e e-mail mock; recusa Supabase remoto |
| `npm run test:all` | Build + lint + Vitest + pgTAP + E2E |
| `npm run test:qa` | Sinônimo de test:all |

Se algum teste de banco falhar, verifique se é um **defeito demonstrado** ou um **erro na fixture**. Não torne o teste verde removendo regras. Veja a seção 4.

## 2. Arquivos e escopo dos testes

### SQL (pgTAP) — 243 asserções

| Arquivo em `supabase/tests/database/` | Asserções | Regras cobertas |
|---|---:|---|
| `01-schema-and-contracts.test.sql` | 104 | 13 tabelas, ENUMs, colunas, FKs, UNIQUE, RLS, índices, funções e privilégios |
| `02-identity-rls.test.sql` | 17 | Criação automática de perfil/papel, isolamento RLS, própria conta, Master |
| `03-occurrence-lifecycle.test.sql` | 37 | IA consumida uma vez, cadastro, status, prioridade, voto, notificações, histórico |
| `04-integrity-constraints.test.sql` | 18 | CHECKs, FKs, unicidade, MIME, 5 MiB, posições de fotos, integridade de ENUMs |
| `05-forwarding-transactions.test.sql` | 17 | Órgão ativo, status PENDING/SENT/FAILED, autoria, idempotência, auditoria |
| `06-privacy-and-visibility.test.sql` | 15 | Mapa, privacidade, fotos ocultas, metadados e observações internas |
| `07-account-admin-and-sla.test.sql` | 16 | Desativação/anonimização, fila de Auth, poderes MASTER, dashboard e SLA |

### TypeScript / Vitest

Novos testes em:
- `tests/unit/modules/occurrences/finalize-occurrence.rules.spec.ts`
- `tests/unit/modules/occurrences/photo-access-and-public-dto.spec.ts`
- `tests/unit/modules/occurrences/occurrence-query-validation.spec.ts`
- `tests/unit/modules/moderation/moderation-business-rules.spec.ts`

Permanecem ativos os testes anteriores de autenticação, roles, identity, categorias, IA, encaminhamento de e-mail, notificações e segurança HTTP.

## 3. Matriz de regras de negócio

`✓` = cenário automatizado; `△` = somente parcial/indireto; `—` = não validado por esta etapa.

| Especificação | Testes | Estado |
|---|---|---|
| Cadastro público → CITIZEN ativo, profile e user_role | SQL 02 | ✓ |
| Papel e isolamento por RLS de profiles/user_roles | SQL 02, testes auth existentes | ✓ |
| MASTER vs OPERATIONAL e último MASTER ativo | SQL 02/07 | ✓ |
| Desativar cidadão; anonimizar profile; job Auth | SQL 07, testes ID existentes | ✓ |
| Revogação de sessões e anonimização no Auth remoto | Mocks ID, sem serviço externo | △ |
| CAT01–CAT07, FKs e categoria ativa | SQL 01/03, unit OCC | ✓ |
| Upload 1–3 JPEG/PNG e limites | Vitest AI existente, SQL 04 e unit OCC | ✓ |
| Análise COMPLETED, dono, consumo único | SQL 03 e unit OCC | ✓ |
| Threshold AI 0,7, fallback CAT07, erro e retry | Testes AI preexistentes | ✓ |
| Execução de IA assíncrona após crash/restart | Não existe teste de recuperação real | — |
| Coerência AI_CONFIRMED / AI_EDITED / USER_MANUAL | Unit OCC + schema; validação SQL limitada | △ |
| Cadastro RECEIVED, prioridade inicial, foto e histórico | SQL 03/04 | ✓ |
| Transições, rejeição, prioridade, IN_SERVICE e RESOLVED | Unit MOD + SQL 03 | ✓ |
| Imutabilidade location_original, georreferenciamento | SQL 01 e RPC; falta teste de trigger dedicado | △ |
| Mapa público, status, arredondamento, visibilidade | SQL 03/06 | ✓, com regressões detectadas |
| Fotos públicas com signed URL e sem storagePath no DTO | Unit photo + SQL 06; falta Storage real | △ |
| Filtros geográficos, paginação e ordenação | Unit query; SQL parcial | △ |
| Histórico e observações visíveis conforme perfil | SQL 03/06 | ✓, com regressões detectadas |
| Voto: autenticado, não próprio, único, removível | SQL 03 + constraints SQL 04 | ✓ |
| Voto concorrente com transição de status | Locking SQL previsto; falta stress concorrente | △ |
| Notificações na mesma transação, destinatário e privacidade | SQL 03/06, unit notificações existente | ✓ |
| Forwarding: confirmado, órgão ativo e auditado | SQL 05, unit forwarding existente | ✓ |
| Email HTTP real / falha de rede real | Unit dos providers; sem rede externa | △ |
| Erros HTTP, validação, rate limit e logs | Testes de integração HTTP existentes | ✓ |
| End-to-end cidadão/moderação/administrador via API+DB reais | Não incluído nesta etapa | — |
| Regra “foto capturada somente pela câmera” | App mobile, não verificável apenas pelo backend | — |
| Realtime/push no aplicativo | Config SQL existente; sem cliente mobile/teste Realtime | — |

## 4. Defeitos identificados pelos testes

**O resultado do banco pode permanecer vermelho até a correção das migrations. Isso não significa necessariamente erro na suíte.**

1. **Retorno de funções SQL como registro composto**: `update_occurrence_priority` e `set_occurrence_public_visibility` utilizam `RETURN (SELECT * FROM public.occurrences ...)`. O banco local emitiu SQLSTATE `42601: subquery must return only one column`. Isso interrompe prioridade/visibilidade, embora as operações parciais sejam revertidas pela exceção. Revisar assinatura e retorno composto em migration corretiva.
2. **Permissões de execução anon**: `has_function_privilege('anon', ..., 'EXECUTE')` retornou TRUE para `create_forwarding` e `record_forwarding_result`. As funções ainda contêm checagem interna `auth.uid()` e ADMIN; a exposição de EXECUTE é uma superfície adicional que merece menor privilégio. Validar ACLs e ownership no remoto antes de corrigir.
3. **Visibilidade de fotografias ocultas e histórico interno**: `is_occurrence_visible` não usa `public_visible`; `get_occurrence_history` retorna eventos de observações internas ao autor. SQL 06 verifica ambos. A projeção pública e as políticas precisam ser alinhadas.
4. **Transações Storage/Postgres**: o envio e movimentação física não faz parte dos testes pgTAP; são necessárias verificações de integração com Supabase Storage e compensação de falhas.
5. **Versão remota**: esta suíte não confere automaticamente o histórico de migrations do projeto hospedado. Rodar em um ambiente local limpo é condição necessária, não suficiente, para homologar remoto.

As suites 03 e 06 preparam diretamente alguns campos de fixtures **depois de registrar a falha da RPC**, para permitir que testes independentes continuem rodando. Isso não altera migrations nem mascara a falha principal.

## 5. GitHub Actions

Workflow: `.github/workflows/inframap-tests.yml`:

- Job **TypeScript + Vitest**: Node 22, npm ci, build, lint e testes.
- Job **Supabase local + pgTAP**: inicializa stack local em Docker, executa SQL e para os containers.

Aprovado em todos os jobs só após **todas** as assertivas serem verdadeiras. Se um teste falhar, consulte a linha `Failed test N` e o contexto da RPC no log do job.

### Processo recomendado

Executar inicialmente `npm run test:unit`, depois `npm run test:integration`, em seguida `npm run test:db`. Ao corrigir o código/migration em uma branch de correção, executar `npm run test:all` e só então abrir PR de integração.

## 6. Sprint 2 — QA-01, QA-02 e QA-03 (Jira)

- [API1-63](https://deividdev.atlassian.net/browse/API1-63) **QA-01**: Vitest isolado por módulos, mocks de repositories/providers, casos positivos e negativos (IA, evidências, proveniência, transições, prioridade, votação, notificações, filtros).
- [API1-64](https://deividdev.atlassian.net/browse/API1-64) **QA-02**: testes pgTAP reais de tabela, ENUM, FK, CHECK, RLS, RPC, transações, observações, voto, notificações, níveis MASTER/OPERATIONAL e bucket. O E2E verifica adicionalmente uploads e signed URLs reais.
- [API1-65](https://deividdev.atlassian.net/browse/API1-65) **QA-03**: `tests/e2e/citizen-and-admin-flows.e2e.spec.ts` valida cadastro e login no Supabase Auth, perfil, upload multipart e Storage, IA mock, revisão e finalização, mapa e detalhes, voto, observações, prioridade, moderação, resolução/rejeição, notificações, dashboard, gestão Master, órgãos e forwarding usando e-mail mock.

### Regra obrigatória de isolamento

`npm run test:e2e` chama `scripts/run-local-e2e.ts`. O script obtém credenciais exclusivamente de `supabase status -o env` e **recusa** toda URL cujo host não seja `127.0.0.1`, `localhost` ou `::1`. Não use credenciais do Supabase remoto nem flags que permitam conexão externa. Contas de teste são únicas e fictícias.

A suíte E2E é separada do `npm test` para não permitir que os testes locais com mocks acessem o Supabase real por engano. Os testes criam registros temporários **somente no banco local**; para começar uma nova instalação local do zero use `npx supabase db reset --local` **apenas depois de confirmar que está conectado ao ambiente de desenvolvimento local**.

### Testes de regressão que podem falhar por bugs da main

- `update_occurrence_priority`: retorno SQL composto incorreto (SQLSTATE 42601). Um cenário E2E verifica a resposta HTTP; o cenário de resolução subsequente utiliza prioridade semeada **somente no banco local**, com comentário explícito, para testar o restante do fluxo independentemente.
- `set_occurrence_public_visibility`: mesmo erro de retorno composto (SQLSTATE 42601).
- `create_forwarding` e `record_forwarding_result`: EXECUTE concedido ao papel anon no banco local, apesar da checagem de `auth.uid()` no corpo da função. Revisar privilégios por defense in depth.
- Histórico/Storage: revisar `public_visible` e a visibilidade de ações internas na função `get_occurrence_history`.

**Nunca eliminar esses asserts para forçar CI verde.** A execução final do job `database` roda pgTAP e E2E independentemente (com `continue-on-error` somente nos passos intermediários) e **falha** se qualquer uma das suítes falhar.

### Limites de escopo

A captura física pela câmera é obrigação do aplicativo móvel (não verificável dentro do backend); o E2E envia uma imagem PNG de teste. Os cenários não dependem de Gemini real nem provedor de e-mail externo — usam os providers mock previstos para o MVP. A testagem de migrações em banco novo não demonstra, por si só, compatibilidade com o Supabase remoto atualmente vinculado.

## 7. Resultados observados e parecer final

- **QA-01:** `npm test`, TypeScript e lint aprovados no Actions; 276 casos passaram, 1 skip da integração externa.
- **QA-02:** pgTAP local com **243 asserções** executadas, **232 aprovadas e 11 falhas** de regressão, incluindo SQLSTATE 42601 em 3 RPCs, ACL de EXECUTE e privacidade. Não remover asserts.
- **QA-03:** **11 testes E2E** executados em Supabase local, **5 aprovados e 6 falhas** reproduzidas: moderação/histórico HTTP 500, votos públicos HTTP 401, detalhe com `photoUrls: []`, URL assinada de foto oculta HTTP 200 e prioridade HTTP 500. Relatório: [GitHub Actions 43285831320](https://github.com/ADIGorg/InfraMap/actions/runs/43285831320).
- **Auditoria com localização de arquivos, evidências, prioridades e propostas de correção:** ver [qa-sprint2-review.md](./qa-sprint2-review.md).
