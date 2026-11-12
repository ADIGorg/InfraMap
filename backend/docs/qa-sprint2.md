# API1 Sprint 2 — execução e auditoria QA-01, QA-02 e QA-03

**Data da auditoria:** 12/11/2026.  
**Jira:** [API1-63 — QA-01](https://deividdev.atlassian.net/browse/API1-63), [API1-64 — QA-02](https://deividdev.atlassian.net/browse/API1-64), [API1-65 — QA-03](https://deividdev.atlassian.net/browse/API1-65).  
**Base GitHub:** `main` no commit `d4dbe2b60416261bc3c58079cd0f39e492c9b056`.  
**Branch:** `feature/qa-sprint2-20261112`.

> **Escopo:** testes e documentação; NÃO foram modificados os módulos de produção, as migrations aplicadas ou a branch `main`. Os testes que falham por erros reais são mantidos como regressões. Não considerar os três tickets homologados enquanto os critérios críticos não passarem.

## Preparação e execução: VS Code

Node.js 22+, npm, Docker Desktop e Supabase CLI (já está nas dependências de desenvolvimento: usar `npx supabase`). Executar estes comandos no terminal do VS Code:

```bash
git fetch origin
git switch feature/qa-sprint2-20261112
cd backend
npm ci

# Opcional: testes rápidos sem Docker
npm run build
npm run lint
npm run test:unit
npm run test:integration

# Iniciar stack dedicada de QA na máquina
npx supabase start -x studio,imgproxy,logflare,vector,mailpit,edge-runtime,realtime,supavisor

# Regras diretamente no PostgreSQL, com pgTAP e rollback
npm run test:db

# Integração real: JWT, RLS, RPCs, Auth e Storage local
npm run test:integration:db

# Aplicação Express + DB real + IA/e-mail mock
npm run test:e2e

# Executa tudo na sequência (requer stack iniciada)
npm run test:all

# Encerrar stack
npx supabase stop
```

Os comandos `test:integration:db` e `test:e2e` usam `scripts/run-qa-local.ts` para obter automaticamente as credenciais pelo `supabase status -o env`. São **bloqueados fora de localhost** e não permitem rodar no Supabase hospedado. O `test:db` aponta para a stack local da Supabase CLI. **Não usar** `supabase db reset --linked`, `db push`, `migration repair` ou `test db --remote` para executar esses testes.

## QA-01 — Testes unitários sem Supabase remoto

| Arquivo | Casos |
|---|---|
| `tests/unit/modules/occurrences/finalize-occurrence.rules.spec.ts` | Autoria, análise concluída, categoria ativa, fotos/MIME, proveniência IA |
| `tests/unit/modules/occurrences/occurrence-query-validation.spec.ts` | Paginação, filtros, limites geográficos, consulta pública |
| `tests/unit/modules/occurrences/photo-access-and-public-dto.spec.ts` | Matriz de permissões para fotos, URLs assinadas e projeção pública |
| `tests/unit/modules/moderation/moderation-business-rules.spec.ts` | Transições, rejeição, prioridade, atendimento, observação, localização e classificação |
| `tests/unit/modules/votes/vote-rpc-business-rules.spec.ts` | Uso da RPC, SQLSTATE para auto-voto, voto duplicado, conflito e ausência de voto |
| Suítes pré-existentes | Identidade, autenticação, e-mail, categorias, IA/fallback e notificações |

**Evidência efetiva:** GitHub Actions [execução 43285364087](https://github.com/ADIGorg/InfraMap/actions/runs/43285364087): **275 testes TypeScript aprovados**, 24 ignorados na execução sem stack, compilação TypeScript e ESLint aprovados. Os testes dependentes de Supabase são executados separadamente.

## QA-02 — Testes com banco, RLS, RPC e Storage reais

`supabase/tests/database/` contém **224 asserções pgTAP em sete suítes**:
- `01-schema-and-contracts`: tabelas, ENUMs, RLS, índices, funções, grants e FKs
- `02-identity-rls`: signup trigger, perfis, papéis, proteção de acesso
- `03-occurrence-lifecycle`: finalização, consumo da IA, moderação, votos, notificação e histórico
- `04-integrity-constraints`: FKs, check constraints, MIME, tamanhos, unicidade
- `05-forwarding-transactions`: PENDING → SENT/FAILED, privilégios, histórico
- `06-privacy-and-visibility`: visibilidade, fotos ocultas, histórico interno, anonimato
- `07-account-admin-and-sla`: desativação, anonimização, Master e SLA

`tests/integration/supabase/auth-rls-storage.spec.ts` executa cadastro público, Auth real, múltiplos JWTs, isolamento RLS, tentativa de escalonamento de papel, privilégios MASTER/OPERATIONAL, notificações privadas, Storage privado, geração de signed URLs e negação de RPC administrativa a cidadão.

**Evidência efetiva:** **10 testes reais de Auth/RLS/Storage aprovados** (incluindo cadastro público), um teste legado ignorado; pgTAP executou 224 asserções e **8 falharam** no banco local com as migrations atuais. [Ver execução](https://github.com/ADIGorg/InfraMap/actions/runs/43285364087).

## QA-03 — Testes E2E usando API real

`tests/e2e/citizen-administration.e2e.spec.ts` valida com Supertest:
- Login JWT real e GET/PATCH do próprio perfil
- Upload multipart de PNG para o Storage local
- IA mock com `202 Accepted`, polling do status, escolha humana e `finalize_occurrence`
- Consulta própria e pública, isolamento de outro usuário e fotografia com URL assinada
- Fluxo administrativo RECEIVED → UNDER_ANALYSIS → CONFIRMED → IN_SERVICE → RESOLVED
- Rejeição justificada; voto único, auto-voto e retirada
- Resposta pública, observação interna, notificações e histórico
- Gestão de órgãos Master, dashboard, encaminhamento com e-mail mock
- Casos **independentes** de URL pública e visibilidade de fotografias ocultas para não depender da moderação defeituosa

As fixtures criam usuários aleatórios no **Supabase local**, evitam colisão entre execuções e usam provedores mock para IA/e-mail. Isso valida os caminhos API → SQL → Storage sem disparar requisições a serviços pagos.

**Evidência efetiva:** **5 dos 13 cenários E2E passaram e 8 falharam**. Os seis testes da cadeia de moderação/rejeição falham ou sofrem cascata a partir do erro administrativo de leitura de ocorrência. Os **dois testes independentes** falharam comprovando defeitos adicionais: detalhe público confirmou `photoUrls=[]` onde se esperava uma URL assinada; e o endpoint público de foto devolveu HTTP **200** para ocorrência `public_visible=false`. [Ver execução](https://github.com/ADIGorg/InfraMap/actions/runs/43285364087).

## Revisão técnica final: defeitos comprovados (não corrigidos nesta branch)

| Urgência | Ponto na main | Evidência e ação requerida |
|---|---|---|
| **P0** | `SupabaseOccurrenceModerationRepository.getOccurrenceById` | Leitura direta da tabela `occurrences` pelo cliente autenticado retorna erro ACL/500. Todos os casos de uso de moderação chamam o método e deixam o E2E bloqueado. Usar RPC de leitura com checagem segura de admin ou projetar política de leitura explícita, sem service-role indiscriminado |
| **P0** | RPC `update_occurrence_priority` | Retorno `RETURN (SELECT * FROM public.occurrences ...)` causa `42601`, impede salvar prioridade |
| **P0** | RPC `set_occurrence_public_visibility` | Mesmo erro de retorno composto `42601`, impede ocultar/reexibir |
| **P0** | `is_occurrence_visible` e policy `occurrence_photos` | `public_visible=false` não é respeitado na leitura de metadados de fotos; E2E público precisa recusar signed URL para ocultas |
| **P0** | `get_occurrence_history` | Histórico interno `OBSERVATION_INTERNAL_ADDED` aparece na consulta pelo autor; restringir itens internos no SQL e aplicação |
| **P1** | `SupabaseOccurrenceQueryRepository.getPublic` | `photos: []` constante: a rota de detalhe público jamais gera `photoUrls` mesmo para ocorrência confirmada com foto; obter fotos autorizadas em consulta adicional segura |
| **P1** | ACL de `create_forwarding`, `record_forwarding_result` | `anon` mantém privilégio `EXECUTE`; RPC ainda checa `auth.uid()`/admin, mas grant desnecessário amplia superfície; revogar explicitamente de anon e validar na instância hospedada |
| **P1** | `SupabaseOccurrenceRepository.finalize` | RPC de banco commita antes do move no Storage; se falhar a transferência, restam metadados apontando para caminho inexistente. Exige desenho de compensação/idempotência e testes de falha |
| **P1** | Moderação/histórico: `getHistory` | Leitura direta de `occurrence_history` / `observations` pelo authenticated pode ter o mesmo conflito de ACL e deve ser substituída por leitura autorizada |
| **P2** | Arquitetura versus estrutura idealizada | Domínio e aplicação ainda importam detalhes de apresentação/infraestrutura; falta centralização explícita de contratos, política de transição e mappers; fazer refatoração incremental, não copiar árvore cegamente |
| **P2** | Integração IA | Main ainda oferece `AI_PROVIDER=mock/http`; discussão anterior de Gemini não está implementada nela. Validar configuração real e estabelecer provider Gemini sem interromper o MVP |
| **P2** | Contrato OpenAPI | DOC-01 segue `A fazer` no Jira; revisar rotas do código vs documentação e atualizá-la antes da homologação final |

**As seis falhas iniciais de E2E não representam necessariamente seis bugs independentes:** as operações posteriores falham em cascata porque a ocorrência não sai de RECEIVED. Os testes de projeção pública foram separados para detectar erros independentes.

## Status de aceite

- **QA-01:** testes implementados e executados com sucesso (build, lint, unitários).
- **QA-02:** suíte SQL e integração real implementadas; **não homologado** enquanto 8 assertivas de segurança/funções SQL não passarem.
- **QA-03:** automação E2E implementada e executada; **não homologado** enquanto fluxos de moderação, foto pública e privacidade não passarem.
- **Jira:** não alterar automaticamente para Feito; requer correção de bugs e reexecução verde.

Todos os diagnósticos se baseiam em **código versionado na main** e em **execução de CI com Supabase local**, não no estado remoto do banco de produção. A integridade da instância hospedada não foi testada.
