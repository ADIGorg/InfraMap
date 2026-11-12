# Refatoração da API — Sprint 2 (11/11/2026)

> Branch: `refactor/sprint2-integrity-security-20261111`  
> Origem: `docs/architecture-openapi-domain-database-20261111`  
> **Não executa migrations remotas e não altera `main`.**

## Objetivo e arquitetura

Esta etapa corrige bloqueios prioritários da auditoria API1 Sprint 2, preservando:
- Monólito modular, N-Layer, DDD seletivo e MVC na apresentação.
- Nomenclatura de arquivos e pastas em **kebab-case**; contratos em **PascalCase** e variáveis em **camelCase**.
- Domínio independente de Express, Supabase e Zod.
- Validadores Zod na camada de apresentação, casos de uso na aplicação e repositórios Supabase na infraestrutura.

Não houve implementação das tarefas FWD-01/FWD-02, APP-CAM, APP-NOTIF, APP-FWD ou DEMO-01; essas são fases subsequentes.

## Mudanças implementadas

### SQL e segurança

Migrations **aditivas**, após as 38 migrations existentes:

1. `20261111120000_fix_sprint2_integrity_and_rpc_permissions.sql`
   - Substitui a assinatura problemática de `finalize_occurrence` por uma que recebe ID previamente reservado e a origem da localização.
   - Verifica `auth.uid()`, usuário ativo, propriedade e exclusividade de `ai_analyses` com `FOR UPDATE`.
   - Valida fontes reais `field_source` (`USER_MANUAL`, não `MANUAL`), caminho da foto no Storage e posições 1–3.
   - Cria ocorrência, metadados das fotos, consumo da análise e histórico com `actor_type` em uma transação.
   - Restringe `list_occurrences`/`get_occurrence` a `service_role` para impedir forja de `p_role` por clientes.
   - Vincula operações MOD à identidade autenticada e à verificação de ADMIN ativo.
   - Reutiliza `transition_occurrence` de DB-10 para status, histórico e notificações atômicos.
   - Faz `create_occurrence_observation` delegar a notificação de resposta ao trigger `notify_citizen_response`, evitando duplicidade.
   - Corrige `actor_type`, `field_source` e atualização de `status_updated_at`.

2. `20261111121000_fix_occurrence_read_rpc_contracts.sql`
   - Corrige tipo de `author_name` no retorno de listagem.
   - Restringe uso da RPC ao backend, qualifica referências SQL e valida paginação/bounding box.
   - Retira estados terminais de consultas de pontos administrativos ativos.

### TypeScript e REST

- **Identity**: GET e PATCH definitivos de `/api/v1/identity/me` montados em `routes/index.routes.ts`, removendo o GET provisório conflitante.
- **Occurrences**: origem `USER_MANUAL`, JPEG/PNG, limite 5 MB e origem `GPS|MANUAL`; filtros de listagem convertidos de `req.validated.query` para DTO `ListFilters`.
- **Finalização**: fotos copiadas por `Supabase Storage` de `temporary/{user}/{analysis}/` para `occurrences/{occurrence}/` **antes** da RPC, com limpeza compensatória se falhar; somente a RPC usa o cliente com JWT.
- **Moderação**: removidos `Proxy` e casts `as unknown as` da composição; RPCs de escrita usam o cliente JWT e autorização SQL baseada em `auth.uid()`.
- **Histórico**: papel de negócio consultado via `user_roles`, bloqueio de conta inativa, ocultação de observações internas e erros HTTP tipados.
- **Domínio**: entidade de ocorrência, tipos de status/prioridade, valor de geolocalização e política de transições.
- **AI/Gemini**: cliente do Storage inicializado na operação, não na criação da aplicação (facilita testes e injeção de dependências).
- **Documentação**: OpenAPI ajustado ao perfil real, à finalização e a 409.
- **CI**: `.github/workflows/backend-ci.yml` compila TypeScript, executa lint e Vitest com Node.js 22.

## Plano obrigatório de aplicação das migrations

**Não executar em produção ou projeto compartilhado sem verificar o estado efetivo do banco.** A auditoria identificou possível divergência entre migrations locais de 09/11 e banco remoto.

### Antes de qualquer aplicação

1. Fazer backup lógico do banco em ambiente autorizado.
2. Inspecionar `supabase migration list --linked` e confrontar com `supabase_migrations.schema_migrations`.
3. Conferir a existência, as assinaturas e os privilégios das RPCs:
   ```sql
   SELECT p.proname,
          pg_get_function_identity_arguments(p.oid) AS signature,
          p.prosecdef AS security_definer,
          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'finalize_occurrence', 'list_occurrences', 'get_occurrence',
       'transition_occurrence_status', 'create_occurrence_observation',
       'correct_occurrence_classification'
     );
   ```
4. Em um **ambiente local/isolado**, aplicar migrations na ordem e executar as suítes de integração.
5. Investigar qualquer lacuna na sequência antes de `db push`. **Não usar `migration repair` automaticamente** para mascarar divergências.

### Cenários obrigatórios em Supabase de homologação

- Cidadão A não consegue finalizar análise de B ou chamar RPC com `p_author_id=B`.
- Finalização de A com 1 e 3 fotos válidas: posições 1..3, objetos permanentes e status `CONSUMED`.
- Duas finalizações simultâneas da mesma análise: apenas uma ocorrência; segunda transação revertida.
- Sem foto/categoria ativa/análise COMPLETED/localização válida: banco não deixa dados parciais.
- Cidadão não consegue chamar RPCs de moderação nem falsificar `p_admin_id`.
- `anon` e `authenticated` não executam diretamente as RPCs de consulta por papel.
- Transições permitidas, histórico `actor_type=USER`, `status_updated_at`, notificação na mesma transação.
- `CITIZEN_RESPONSE` cria uma notificação; `INTERNAL` não aparece ao cidadão.
- GET público nunca expõe author_id, location_original, storagePath.
- URLs assinadas expiram; usuários inativos são bloqueados.

## Limites e riscos que permanecem

1. **Sem homologação SQL remota:** o pipeline CI compila e executa testes simulados, mas não inicia Supabase local nem valida SQL em PostgreSQL.
2. **Operações Storage + Postgres não são uma única transação distribuída.** A cópia das fotos ocorre antes da RPC. Falhas são compensadas, mas interrupção abrupta pode deixar objetos órfãos. Recomenda-se varredura de temporários/órfãos antes da demonstração.
3. **Migrations históricas não foram alteradas.** A nova sequência só será efetiva depois de todas as anteriores serem aplicadas corretamente no ambiente alvo.
4. **Mudanças por fora da API:** SQL `get_occurrence` continua retornando detalhes internos somente ao `service_role`. O contrato HTTP público os transforma em projeção segura.
5. **IA assíncrona em memória do processo:** uma reinicialização durante `PROCESSING` pode exigir rotina de recuperação. Redis/filas externas não fazem parte do MVP.
6. **FWD/QA real/E2E/DEMO e aplicativo:** são tarefas posteriores; não foram marcadas como concluídas no Jira.

## Execução da validação de código

```bash
cd backend
npm ci
npm run build
npm run lint
npm test
```

O workflow no GitHub verifica essas etapas em pushes, mas **não comprova migrations aplicadas nem operações SQL/Storage reais**.

## Contratos recomendados

- `categorySource` e `descriptionSource`: `AI_CONFIRMED | AI_EDITED | USER_MANUAL`.
- `location`: objeto `{ lat, lng, source?: 'GPS' | 'MANUAL' }`, default `GPS`.
- `photos`: 1 a 3 objetos `{ storagePath, mimeType, sizeBytes }`, MIME `image/jpeg` ou `image/png`, máximo 5 MiB.
- `/identity/me` GET e PATCH: perfil cadastral do próprio usuário, papel consultado separadamente em `user_roles`.

## Critério de merge

Não mesclar a branch enquanto houver falhas no CI ou ausência de validação em banco de homologação para os fluxos críticos. O fato de os arquivos SQL estarem versionados não significa que o banco remoto tenha recebido as correções.
