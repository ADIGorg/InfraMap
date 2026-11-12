# Plano de qualidade — InfraMap / API Sprint 2

**Base congelada:** main commit \`d4dbe2b60416261bc3c58079cd0f39e492c9b056\` (12/11/2026).
**Branch de implementação:** \`qa/sprint2-qa01-qa02-qa03-20261112\`.
**Jira:** [QA-01](https://deividdev.atlassian.net/browse/API1-63), [QA-02](https://deividdev.atlassian.net/browse/API1-64), [QA-03](https://deividdev.atlassian.net/browse/API1-65).

Não houve alteração de migrations, código de produção nem do banco hospedado. O trabalho desta branch é composto de **testes, scripts e automação**. Não marcar tickets como concluídos até todos os critérios e verificações de integração estarem aprovados.

## Dependências

- Node.js >= 22.12, npm, Docker Desktop com os containers ativos.
- Supabase CLI (\`npx supabase\` — incluído como dev dependency).
- Executar apenas em **Supabase local**, com hostname \`localhost\` ou \`127.0.0.1\`; as suítes que criam usuários recusam URLs remotas.
- Não é necessário conectar Gemini nem provedor de e-mail externo: \`AI_PROVIDER=mock\` e \`EMAIL_PROVIDER=mock\`.
- Nunca usar \`supabase test db --linked\`, \`supabase db reset --linked\` ou \`supabase db push\` para QA.

## Execução no VS Code

\`\`\`bash
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
\`\`\`

As três variáveis SUPABASE devem estar no ambiente **antes** de executar \`test:db-integration\` e \`test:e2e\`. Exemplos no PowerShell do VS Code:

\`\`\`powershell
$env:NODE_ENV = "test"
$env:AI_PROVIDER = "mock"
$env:EMAIL_PROVIDER = "mock"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY = "<anon key local>"
$env:SUPABASE_SECRET_KEY = "<service_role key local>"
npm run test:e2e
\`\`\`

Para executar **tudo**, depois que o Supabase local estiver iniciado e as chaves estiverem exportadas:

\`\`\`bash
npm run test:qa
\`\`\`

A execução combinada para no primeiro teste que falhar; use os comandos individuais para obter todos os relatórios. \`npm test\` não habilita os testes reais: eles exigem \`RUN_SUPABASE_E2E=1\`, definido automaticamente em \`test:db-integration\` e \`test:e2e\`.

## QA-01: unitários e casos de uso

- **Moderação:** todos os estados legais, estados terminais, prioridades, justificativa, ação concreta, classificação, localização e observações.
- **Ocorrências:** cidadão ativo, análise concluída e de sua propriedade, categoria ativa, 1–3 fotos, MIME/tamanho, descrição e proveniência da IA.
- **Fotografias:** autor/admin/público, estados permitidos, signed URLs e ausência de \`storagePath\` no DTO público.
- **Consultas:** paginação, ordenação, filtro de status, limites de lat/lon e identidade do proprietário.
- **Votos:** comandos ADD/REMOVE, tradução de SQLSTATE de voto próprio, duplicado, inelegível e inexistente.
- **IA:** os testes existentes da main verificam fallback CAT07 abaixo de 0,70, retries, concorrência, falhas, conclusão e propriedade do usuário.
- **Identidade, e-mail e notificações:** aproveita testes presentes na main.

### QA-02: integração com banco/Storage

Os testes pgTAP em \`supabase/tests/database\` executam **224 asserções** em sete arquivos:

| Teste | Quantidade | Cobertura |
|---|---:|---|
| 01 | 104 | Esquema, tipos, FKs, constraints, índices, RLS, RPCs e privilégios |
| 02 | 17 | Cadastro automático, RLS de identidade, perfis, papéis |
| 03 | 37 | Finalização, consumo de IA, moderação, voto, notificações, histórico |
| 04 | 18 | Domínio de fotos, tamanho, posições, ENUM, CHECK e FKs |
| 05 | 17 | Encaminhamentos PENDING/SENT/FAILED, autorização e atomicidade |
| 06 | 15 | Publicação, ocultação, fotos privadas e observações internas |
| 07 | 16 | Desativação, anonimização, fila Auth, MASTER, dashboard/SLA |

\`tests/integration/supabase/storage-rls.real.spec.ts\` usa **clientes HTTP e SDK reais** para autenticar vários usuários, verificar RLS por papel, impedir upload/download/assinatura de foto privada e isolar notificações. Nenhum usuário ou foto de produção é utilizado.

### QA-03: E2E com HTTP real

\`tests/e2e/citizen-moderation.e2e.spec.ts\` faz cadastro Supabase Auth, confirmação e login; consulta/edição de perfil; upload JPEG/PNG, análise assíncrona com IA mock, revisão da sugestão e finalização; consulta pública/privada; moderação, votos, observações/notificações, prioridade, atendimento, resolução, rejeição e estados terminais.

\`tests/e2e/administration-forwarding.e2e.spec.ts\` verifica papéis MASTER/OPERATIONAL, criação de administradores e órgãos, dashboard, encaminhamento com provedor mock, histórico e preservação do status da ocorrência.

## Gate de CI

\`.github/workflows/qa-sprint2.yml\` executa dois jobs independentes. O primeiro cobre build + lint + unitários + integrações HTTP com mocks. O segundo inicia o Supabase local, extrai credenciais efêmeras apenas do ambiente local, executa pgTAP, integração com Storage/RLS e fluxos E2E; cada parte roda mesmo que outra falhe, e **o resultado agregado fica vermelho se qualquer uma falhar**. Os logs permitem distinguir código quebrado de defeitos na fixture ou indisponibilidade de Docker.

## Revisão preliminar do código da main — correções separadas de QA

Os testes pgTAP anteriormente executados sobre a mesma base de migrations identificaram:

1. **P0** — \`update_occurrence_priority\` e \`set_occurrence_public_visibility\` lançam SQLSTATE \`42601\` ao retornar um registro composto por \`RETURN (SELECT * ...)\`; corrigir com migration incremental e revalidar toda a API de moderação.
2. **Segurança** — as RPCs de encaminhamento continuam com privilégio EXECUTE para \`anon\` no schema local (apesar de suas verificações internas). Revisar e revogar permissões desnecessárias.
3. **Privacidade** — alinhar o helper \`is_occurrence_visible\`, regras de acesso a fotos e flag \`public_visible\`; cidadão não pode observar eventos internos no histórico.
4. **Consistência** — \`finalize_occurrence\` confirma a transação no PostgreSQL antes de mover as fotografias no Storage; falha ao mover arquivos deixa a ocorrência e o Storage divergentes.
5. **QA ainda não substitui homologação remota** — testes locais não verificam \`supabase_migrations.schema_migrations\` ou privilégios efetivos no banco hospedado.

**Não corrigir esses pontos reescrevendo migrations já aplicadas.** Abrir migrations incrementais e validações adicionais em branch própria. Não há autorização para alterar \`main\` nesta tarefa.
