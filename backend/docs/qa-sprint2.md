# Plano de qualidade — InfraMap / API Sprint 2

**Base congelada:** main commit `d4dbe2b60416261bc3c58079cd0f39e492c9b056` (12/11/2026).
**Branch de implementação:** `qa/sprint2-qa01-qa02-qa03-20261112`.
**Jira:** [QA-01](https://deividdev.atlassian.net/browse/API1-63), [QA-02](https://deividdev.atlassian.net/browse/API1-64), [QA-03](https://deividdev.atlassian.net/browse/API1-65).

Não houve alteração de migrations, código de produção nem do banco hospedado. O trabalho desta branch é composto de **testes, scripts e automação**. Não marcar tickets como concluídos até todos os critérios e verificações de integração estarem aprovados.

## Dependências

- Node.js >= 22.12, npm, Docker Desktop com os containers ativos.
- Supabase CLI (`npx supabase` — incluído como dev dependency).
- Executar apenas em **Supabase local**, com hostname `localhost` ou `127.0.0.1`; as suítes que criam usuários recusam URLs remotas.
- Não é necessário conectar Gemini nem provedor de e-mail externo: `AI_PROVIDER=mock` e `EMAIL_PROVIDER=mock`.
- Nunca usar `supabase test db --linked`, `supabase db reset --linked` ou `supabase db push` para QA.

## Execução no VS Code

```bash
git fetch origin
git switch qa/sprint2-qa01-qa02-qa03-20261112
cd backend
npm ci

# QA-01: casos de uso e validações isoladas
npm run test:unit

# Integrações HTTP com mocks (não prova integração real)
npm run test:integration

# Iniciar PostgreSQL + Auth + Storage descartáveis
npx supabase start
npx supabase status

# Copiar as três chaves do ambiente local, nunca do projeto hospedado
# SUPABASE_URL       <- API URL
# SUPABASE_PUBLISHABLE_KEY <- anon key
# SUPABASE_SECRET_KEY     <- service_role key

npm run test:db               # 224 asserts pgTAP/RLS/transações
npm run test:db-integration    # Supabase Auth, RLS e Storage reais
npm run test:e2e               # jornada completa com o Express real
npx supabase stop
```

As três variáveis SUPABASE devem estar no ambiente **antes** de executar `test:db-integration` e `test:e2e`. Exemplos no PowerShell do VS Code:

```powershell
$env:NODE_ENV = "test"
$env:AI_PROVIDER = "mock"
$env:EMAIL_PROVIDER = "mock"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY = "<anon key local>"
$env:SUPABASE_SECRET_KEY = "<service_role key local>"
npm run test:e2e
```

Para executar **tudo**, depois que o Supabase local estiver iniciado e as chaves estiverem exportadas:

```bash
npm run test:qa
```

A execução combinada para no primeiro teste que falhar; use os comandos individuais para obter todos os relatórios. `npm test` não habilita os testes reais: eles exigem `RUN_SUPABASE_E2E=1`, definido automaticamente em `test:db-integration` e `test:e2e`.

## QA-01: unitários e casos de uso

- **Moderação:** todos os estados legais, estados terminais, prioridades, justificativa, ação concreta, classificação, localização e observações.
- **Ocorrências:** cidadão ativo, análise concluída e de sua propriedade, categoria ativa, 1–3 fotos, MIME/tamanho, descrição e proveniência da IA.
- **Fotografias:** autor/admin/público, estados permitidos, signed URLs e ausência de `storagePath` no DTO público.
- **Consultas:** paginação, ordenação, filtro de status, limites de lat/lon e identidade do proprietário.
- **Votos:** comandos ADD/REMOVE, tradução de SQLSTATE de voto próprio, duplicado, inelegível e inexistente.
- **IA:** os testes existentes da main verificam fallback CAT07 abaixo de 0,70, retries, concorrência, falhas, conclusão e propriedade do usuário.
- **Identidade, e-mail e notificações:** aproveita testes presentes na main.

### QA-02: integração com banco/Storage

Os testes pgTAP em `supabase/tests/database` executam **225 asserções** em sete arquivos:

| Teste | Quantidade | Cobertura |
|---|---:|---|
| 01 | 105 | Esquema, tipos, FKs, constraints, índices, RLS, RPCs e privilégios |
| 02 | 17 | Cadastro automático, RLS de identidade, perfis, papéis |
| 03 | 37 | Finalização, consumo de IA, moderação, voto, notificações, histórico |
| 04 | 18 | Domínio de fotos, tamanho, posições, ENUM, CHECK e FKs |
| 05 | 17 | Encaminhamentos PENDING/SENT/FAILED, autorização e atomicidade |
| 06 | 15 | Publicação, ocultação, fotos privadas e observações internas |
| 07 | 16 | Desativação, anonimização, fila Auth, MASTER, dashboard/SLA |

`tests/integration/supabase/storage-rls.real.spec.ts` usa **clientes HTTP e SDK reais** para autenticar vários usuários, verificar RLS por papel, impedir upload/download/assinatura de foto privada e isolar notificações. Nenhum usuário ou foto de produção é utilizado.

### QA-03: E2E com HTTP real

`tests/e2e/citizen-moderation.e2e.spec.ts` faz cadastro Supabase Auth, confirmação e login; consulta/edição de perfil; upload JPEG/PNG, análise assíncrona com IA mock, revisão da sugestão e finalização; consulta pública/privada; moderação, votos, observações/notificações, prioridade, atendimento, resolução, rejeição e estados terminais.

`tests/e2e/administration-forwarding.e2e.spec.ts` verifica papéis MASTER/OPERATIONAL, criação de administradores e órgãos, dashboard, encaminhamento com provedor mock, histórico e preservação do status da ocorrência.

## Gate de CI

`.github/workflows/qa-sprint2.yml` executa dois jobs independentes. O primeiro cobre build + lint + unitários + integrações HTTP com mocks. O segundo inicia o Supabase local, extrai credenciais efêmeras apenas do ambiente local, executa pgTAP, integração com Storage/RLS e fluxos E2E; cada parte roda mesmo que outra falhe, e **o resultado agregado fica vermelho se qualquer uma falhar**. Os logs permitem distinguir código quebrado de defeitos na fixture ou indisponibilidade de Docker.

## Revisão preliminar do código da main — correções separadas de QA

Os testes pgTAP anteriormente executados sobre a mesma base de migrations identificaram:

1. **P0** — `update_occurrence_priority` e `set_occurrence_public_visibility` lançam SQLSTATE `42601` ao retornar um registro composto por `RETURN (SELECT * ...)`; corrigir com migration incremental e revalidar toda a API de moderação.
2. **Segurança** — as RPCs de encaminhamento continuam com privilégio EXECUTE para `anon` no schema local (apesar de suas verificações internas). Revisar e revogar permissões desnecessárias.
3. **Privacidade** — alinhar o helper `is_occurrence_visible`, regras de acesso a fotos e flag `public_visible`; cidadão não pode observar eventos internos no histórico.
4. **Consistência** — `finalize_occurrence` confirma a transação no PostgreSQL antes de mover as fotografias no Storage; falha ao mover arquivos deixa a ocorrência e o Storage divergentes.
5. **QA ainda não substitui homologação remota** — testes locais não verificam `supabase_migrations.schema_migrations` ou privilégios efetivos no banco hospedado.

**Não corrigir esses pontos reescrevendo migrations já aplicadas.** Abrir migrations incrementais e validações adicionais em branch própria. Não há autorização para alterar `main` nesta tarefa.

## Resultado reproduzido no GitHub Actions — 12/11/2026

- **QA-01:** build + ESLint + 195 testes unitários e 79 testes HTTP com mocks aprovados; os testes de integração remota permanecem ignorados no comando comum.
- **QA-02 (SQL):** todos os 224 testes pgTAP inicialmente executaram, com 8 falhas reais nas RPCs/permissões/privacidade. A rodada final executou **225 asserções pgTAP: 216 aprovadas e 9 reprovadas**. As falhas são regressões de ACL, visibilidade/privacidade e duas RPCs; nenhuma foi desativada.
- **QA-02 (Supabase real):** **5 testes reais executados: 4 aprovados, 1 falhou**. O teste de leitura de ocorrência pelo administrador encontrou `42501 permission denied for table occurrences` e explica `MODERATION_LOOKUP_FAILED` no E2E.
- **QA-03 (E2E):** cadastro/login, perfil, criação de análise de IA e ocorrência privada, além de permissão Master, foram executados com sucesso. **4 testes E2E aprovados, 6 falharam por dependências da moderação, 2 foram ignorados porque a preparação do encaminhamento não conseguiu confirmar a ocorrência**. A leitura `SELECT occurrences` com JWT de administrador é bloqueada por `42501`.

### Inconsistências de produção confirmadas pela suíte

1. **P0 — Moderação não consegue consultar a ocorrência:** `SupabaseOccurrenceModerationRepository.getOccurrenceById` usa `authenticated` para SELECT direto em `public.occurrences`, mas o PostgreSQL retorna falta de privilégio. É necessária uma migration incremental que conceda SELECT com RLS adequada (nunca service_role no lugar da autorização do usuário).
2. **P0 — RPCs administrativas com retorno inválido:** `update_occurrence_priority` e `set_occurrence_public_visibility` lançam `42601` por `RETURN (SELECT * ...)` em função que retorna registro composto; usar retorno tipado apropriado em nova migration.
3. **Segurança — visibilidade/fotos:** terceiro autenticado lê metadados de fotografia de ocorrência oculta; `is_occurrence_visible` não considera `public_visible`.
4. **Privacidade — histórico:** o autor consegue ver eventos `OBSERVATION_INTERNAL_ADDED`, embora não devesse receber observações internas.
5. **Privilégios — RPCs:** `anon` possui `EXECUTE` em `create_forwarding` e `record_forwarding_result`; reforçar ACL além das checagens internas de JWT/ADMIN.
6. **Storage — atomicidade entre serviços:** o commit de `finalize_occurrence` precede a movimentação física da imagem; uma falha posterior pode deixar o banco consistente isoladamente, mas a evidência inacessível.
7. **Implementação de IA na main:** a fábrica atual expõe somente `mock` e `http` (Gemini não aparece como provider nativo diretamente). Confirmar se a integração pretendida será por proxy HTTP ou um adapter específico.

**Decisão:** não alterar migrations de produção, estados do Jira ou main dentro desta branch de QA. Manter CI vermelho nos defeitos reais; corrigir em migration incremental isolada e depois executar tudo novamente.

### Evidências da última execução completa

- <https://github.com/ADIGorg/InfraMap/actions/runs/43287647268> — job QA-01 verde (build, ESLint, unitários e integração HTTP com mocks); job QA-02/03 vermelho com testes reais executados.
- **225** asserções pgTAP, **9** falhas (schema: 3, ciclo de vida: 2, privacidade: 4). Os demais testes SQL passaram, incluindo RLS de perfis, integridade relacional, forwarding e desativação de conta.
- **QA-02 SDK real:** 4/5 aprovados, um caso de moderação negado pela ACL de `occurrences`.
- **QA-03 E2E:** 4/10 aprovados no fluxo cidadão; 6 casos dependentes da moderação falharam; 2 cenários do fluxo de administração/encaminhamento não puderam iniciar após falha em `beforeAll`.
- Para o pacote QA estar pronto para homologação, corrigir as migrations de produção **em uma branch distinta**, aplicar apenas num banco local, e reexecutar os gates até ficarem verdes. Não marcar QA-02/QA-03 como concluídos antes disso.
