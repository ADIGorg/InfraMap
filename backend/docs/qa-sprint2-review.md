# InfraMap — QA Sprint 2: implementação e auditoria da main

**Data:** 12/11/2026  
**Base:** `main` em `d4dbe2b60416261bc3c58079cd0f39e492c9b056`  
**Branch:** `test/qa-01-02-03-sprint2-20261112`  
**Banco:** instância Supabase **local** criada pelo GitHub Actions; estado hospedado não acessado.  
**Regra:** esta branch só adiciona testes, comandos, workflow e documentação; não altera migrations de produção nem regras da aplicação.

## 1. Tickets e evidências

| Jira | Aceite | Implementação |
| --- | --- | --- |
| [API1-63 — QA-01](https://deividdev.atlassian.net/browse/API1-63) | Regras unitárias de sucesso e falha, transições, prioridade, permissões, votos, IA | `tests/unit/modules/{occurrences,moderation,votes,ai-analysis}/`; `npm run test:unit`. Casos de uso e contratos com mocks |
| [API1-64 — QA-02](https://deividdev.atlassian.net/browse/API1-64) | Repositories, RPC, transações, RLS, Storage, roles em banco de teste | `supabase/tests/database/01...09` e `tests/e2e/helpers/local-supabase.ts`; `npm run test:db` |
| [API1-65 — QA-03](https://deividdev.atlassian.net/browse/API1-65) | Jornadas reais cidadão/admin, com mocks somente de IA e e-mail | `tests/e2e/citizen-and-admin-flows.e2e.spec.ts`; `npm run test:e2e` |

Todos estavam com status **A fazer** no Jira quando consultados. Não os movemos para Feito porque as verificações de aceite não passaram integralmente.

## 2. Resultado de validação

- **TypeScript, ESLint e Vitest:** 276 testes passaram; 1 teste de integração externa foi ignorado. Validação no job TypeScript do GitHub Actions, run [43284738789](https://github.com/ADIGorg/InfraMap/actions/runs/43284738789).
- **pgTAP:** 235 asserções executadas no run [43283314374](https://github.com/ADIGorg/InfraMap/actions/runs/43283314374), com 227 aprovadas e 8 falhas; este número precede o arquivo `09-moderation-corrections.test.sql` de oito novos casos.
- **E2E real:** 9 cenários executados no run [43284738789](https://github.com/ADIGorg/InfraMap/actions/runs/43284738789); 5 passaram e 4 falharam, com bloqueios de API reproduzíveis. A suíte foi ampliada posteriormente para verificar fotos ocultas e URLs de detalhe público.
- **Critério de CI:** o job `database` exige pgTAP e E2E verdes. O estado vermelho indica que o projeto **ainda não está homologado**, não que a implementação da suíte de testes tenha sido abandonada.

### Fluxos que passaram em E2E local

- Cadastro público, login no Supabase Auth, perfil e proteção contra alteração de papel.
- Upload HTTP de PNG no Storage local, análise via provider mock, revisão da descrição, consumo da análise e finalização transacional.
- Consulta própria e pública em situações permitidas; URL assinada e download real de evidência.
- Voto próprio recusado, voto de cidadão distinto aceito, duplicidade recusada, remoção de voto.
- Moderação transacional com RPC autenticada em fixtures; resolução e rejeição, consulta de estado final.
- Dashboard, permissões MASTER/OPERATIONAL, criação e desativação de administrador pelo Master, cadastro de órgão e forwarding com provider mock.

**Limite importante:** os fluxos de moderação de fixtures usam a própria RPC transacional autenticada para isolar os problemas do endpoint HTTP. Isso não comprova que o controller de moderação funciona; os testes HTTP específicos continuam falhando até sua correção.

## 3. Achados prioritários, com localização

| Prioridade | Arquivo / função | Evidência | Correção |
| --- | --- | --- | --- |
| **P0** | `src/modules/moderation/infrastructure/repositories/supabase-moderation.repository.ts` — `getOccurrenceById` | O método faz `.from("occurrences").select(...)`, mas a migration `20261107153937_fix_vulenarability_anon_authenticated.sql` executa `REVOKE SELECT ... authenticated`. E2E obteve `500 MODERATION_LOOKUP_FAILED` | Usar RPC de leitura autenticada com `auth.uid()` e autorização, como `get_occurrence_detail`, e mapear resposta no Repository; **não** reabrir SELECT irrestrito |
| **P0** | `get-occurrence-history.use-case.ts` e `supabase-moderation.repository.ts` — `getHistory` | GET de histórico também falha 500 por `getOccurrenceById`; consultas diretas de `occurrence_history`/observations podem conflitar com GRANTs | Usar RPC com regras de autor/admin e redigir/filtrar eventos internos |
| **P0** | `20261111235933_add_update_occurrence_priority.sql` | `RETURN (SELECT * FROM public.occurrences ...)` em função que retorna registro; SQLSTATE `42601`, alteração atômica falha e prioridade não é aplicada | Nova migration de correção com `SELECT * INTO v_occ` e `RETURN v_occ` |
| **P0** | `20261112002329_add_public_visibility.sql` | Mesmo `RETURN (SELECT *...)` em `set_occurrence_public_visibility`; falha `42601` | Nova migration incrementando função |
| **P0** | `20261112002309_add_correct_occurrence_classification.sql` | Mesmo padrão de retorno composto, identificado por análise de código; inclui RESOLVED em estados corrigíveis, apesar da regra de terminal | Testes da suíte `09` e migration corretiva; alinhar máquina de estados |
| **P0** | `20261107143327_configure_rls_and_storage.sql` — `is_occurrence_visible` | Ignora `occurrences.public_visible`: usuário autenticado distinto consegue acessar metadados de foto oculta; pgTAP falhou | Recriar helper autenticado respeitando status **e** `public_visible`; preservar exceções legítimas do autor/admin |
| **P0** | `get-photo-signed-url.use-case.ts` | Autorização pública verifica apenas status, não `public_visible`; controller usa client de serviço para resolver foto; risco de gerar URL de fotografia oculta | Consultar `public_visible` e testar com registro oculto |
| **P1** | `src/routes/index.routes.ts` e `occurrence-history.routes.ts` | `router.use(authenticate)` no histórico é registrado **antes** da rota de votos; GET público `/occurrences/:id/votes` retorna 401 | Isolar autenticação apenas no handler de histórico ou reorganizar rotas; E2E verifica 200 sem token |
| **P1** | `20261107155735_add_read_rpcs_for_occurrences.sql` e versões posteriores de `get_occurrence_history` | RPC expõe `OBSERVATION_INTERNAL_ADDED` ao autor; pgTAP mostrou histórico privado vazando | Filtrar eventos internos no banco e no DTO para cidadão |
| **P1** | `create_forwarding` e `record_forwarding_result` | `has_function_privilege('anon', ... 'EXECUTE') = TRUE` no Supabase local; autenticação interna ainda bloqueia chamadas sem JWT | Revogar EXECUTE de PUBLIC/anon, preservar somente authenticated; conferir ACL no remoto |
| **P1** | `supabase-occurrence-query.repository.ts` — `getPublic` | Projeção mapeia `photos: []`; `GetPublicOccurrenceUseCase` não consegue gerar `photoUrls` no detalhe, apesar da elegibilidade | RPC/view segura deve incluir metadados públicos mínimos ou foto identificável sem `storage_path`; usar serviço de URL assinada |

## 4. Riscos arquiteturais e operacionais ainda presentes

1. **Storage não participa da transação PostgreSQL:** `SupabaseOccurrenceRepository.finalize` confirma ocorrência e consome IA antes de mover arquivos. Falha posterior deixa DB apontando para arquivos inexistentes ou temporários. Projetar compensação/idempotência ou etapa transacional com estado intermediário e retry.
2. **Processamento assíncrono de IA em processo:** `ai-processing.routes.ts` usa `void useCase.execute(...)`. Se a instância reiniciar após responder HTTP 202, o job pode permanecer em PROCESSING. Adotar worker/lease, timeout e recuperação persistente.
3. **Integração de IA na main:** `env.ts` suporta `mock|http`; ainda não existe provider Gemini independente nessa árvore. Comparar com o planejamento do projeto e, se aplicável, migrar mediante configuração e testes.
4. **Acoplamento de camadas:** repositórios usados pela aplicação em arquivos de infraestrutura, casos de uso importando schemas de presentation, controllers construindo clientes externos. A estrutura idealizada sugere portas em domain/application, composition roots e DTOs.
5. **Rotas legadas de identidade:** `identity.routes.ts` contém rotas que retornam 201 sem persistir usuário, úteis apenas como stubs antigos; evitar que clientes as interpretem como cadastro funcional.
6. **Migrations e produção:** 44 migrations foram observadas na árvore `main` desta auditoria. A ordenação local por timestamp é fonte de versionamento, mas a situação no Supabase remoto **não foi verificada**. Evitar editar migrations aplicadas; usar novas correções incrementais.

## 5. Sequência recomendada para finalizar os tickets

1. Criar branch **de correção da aplicação** a partir da main atual e corrigir leitura segura da moderação/histórico e ordem de rotas públicas.
2. Criar migrations **novas e incrementais** para retorno composto, privacidade de fotos/histórico, estados terminais e `EXECUTE` nas RPCs.
3. Executar `npm run test:qa` em ambiente Supabase local e corrigir cada regressão sem remover asserts.
4. Homologar com Storage real e fluxos E2E; confirmar um GitHub Actions totalmente verde, depois preparar PR de integração.
5. Validar histórico de migrations do Supabase hospedado em sessão separada **somente leitura** antes de planejar deploy; não usar `db push`/repair contra produção para fazer testes.

## 6. Comandos seguros no terminal VS Code

```bash
git fetch origin
git switch --track origin/test/qa-01-02-03-sprint2-20261112
cd backend
npm ci
npx supabase start
npm run test:unit
npm run test:integration
npm run test:db
npm run test:e2e
# suíte única (falha se o primeiro grupo não passar)
npm run test:qa
npx supabase stop
```

O executor E2E bloqueia URL Supabase fora de localhost/127.0.0.1/::1. Os dados são fictícios e isolados, com UUIDs únicos. A captura física pela câmera, e-mail externo real, Gemini real e eventos push no aplicativo não são provados por testes do backend.
