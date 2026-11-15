# Ambientes Supabase do InfraMap: local, homologação e produção

## 1. Decisão arquitetural

O InfraMap deverá trabalhar com **três bancos e três credenciais independentes**. Branch do Git **não é** banco separado: uma branch Git não muda automaticamente o projeto Supabase vinculado à CLI.

| Ambiente | Onde roda | Dados | Chaves | Mudanças permitidas |
|---|---|---|---|---|
| LOCAL / QA | Docker no PC ou GitHub Actions | Fixtures sintéticas descartáveis | `npx supabase status` | `npx supabase db reset`, pgTAP, integração e E2E |
| STAGING / homologação | **Projeto Supabase hospedado separado** | Exclusivamente fictícios ou anonimizados | Exclusivas de staging | Migrations após review, smoke tests autorizados |
| PRODUÇÃO | Projeto Supabase hospedado operacional | Dados reais | Exclusivas de produção | Deploy aprovado e monitorado, migrations versionadas |

**O projeto Supabase hospedado atual ainda NÃO foi classificado nesta documentação como produção ou staging**, pois não sabemos se contém usuários reais. Confirmar isso com o responsável antes de vinculá-lo a qualquer comando.

As duas opções para separar remoto são: (a) criar um segundo **projeto Supabase** independente, utilizável sem habilitar recurso de branches; (b) usar **Supabase Branching** se o plano e a configuração permitirem. Recomendamos dois projetos independentes para evitar confusão entre equipes/segredos.

Fontes: https://supabase.com/docs/guides/deployment/managing-environments e https://supabase.com/docs/guides/local-development/cli-workflows.

## 2. Primeiro: confirmar o ambiente atual (sem mutação)

- No Supabase Dashboard, anote **somente para uso privado** o nome do projeto existente e seu Project ref (URL `/dashboard/project/<ref>`).
- Confirme com a equipe se existem usuários e fotos reais. Trate-o como produção até prova em contrário.
- Verifique se está com **backups/PITR, acessos e logs** adequados, antes de qualquer migration.
- Não compartilhe Publishable/Secret Keys, JWTs, service_role, database passwords ou prints com segredos.
- Se uma Secret Key hospedada foi exposta, **revogue/rotacione** no Dashboard e atualize o backend; não é suficiente apenas editar o arquivo `.env`.

## 3. Ambiente local no Windows / VS Code

1. Instale Node.js >=22.12, Docker Desktop com WSL2 e Git.
2. Abra Docker Desktop e confira `docker info` (é preciso mostrar Server sem erro).
3. Dentro de `InfraMap/backend` execute:

```powershell
npm ci
npx supabase start --exclude studio,mailpit,logflare,vector,imgproxy,edge-runtime
npx supabase status
```

4. Configure **no mesmo terminal** as três variáveis vindas da seção `APIs / Authentication Keys` de `supabase status`. Não utilizar chaves S3 nem credenciais hospedadas:

```powershell
$env:NODE_ENV = "test"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY = "<PUBLISHABLE_LOCAL>"
$env:SUPABASE_SECRET_KEY = "<SECRET_LOCAL>"
$env:AI_PROVIDER = "mock"
$env:EMAIL_PROVIDER = "mock"
```

5. Verifique **sem exibir os valores**:

```powershell
$env:SUPABASE_URL
[bool]$env:SUPABASE_PUBLISHABLE_KEY
[bool]$env:SUPABASE_SECRET_KEY
```

6. Execute: `npm run test:db`; `npm run test:db-integration`; `npm run test:e2e`. Para QA, o local host é obrigatório e verificado programaticamente pela fixture.
7. Pare os containers ao terminar: `npx supabase stop`.

`npx supabase db reset` é DESTRUTIVO para o banco **local** e serve para reconstruir as migrations e o seed. Execute só com Docker local aberto e depois de verificar que não há dados locais a preservar. Nunca adicione `--remote` para este passo.

## 4. Criar um Supabase STAGING hospedado

No Dashboard: **New project** → escolha a organização correta → nomeie, por exemplo, **InfraMap Staging** → defina senha de banco exclusiva e salve-a em gerenciador seguro → aguarde a inicialização. Esse projeto deve ter novo Project ref, API URL, Publishable e Secret Key. Não duplique chaves de produção.

Configurar no projeto staging:
- Auth: URL de redirecionamento do cliente de testes e confirmação de e-mail apropriadas; provedores externos com credenciais de teste, nunca reais.
- Storage: bucket privado `occurrence-photos`, limites de MIME/tamanho aplicados pelas migrations.
- Realtime: notificações publicadas conforme migration; testar permissões e performance.
- E-mail: provedor mock ou sandbox, nunca envio para cidadãos/órgãos reais.
- IA: `AI_PROVIDER=mock` nos testes; eventual integração HTTP usa credenciais de teste com quotas.
- Chaves do staging apenas no backend/secret store correspondente; **não no mobile público**, nos commits ou screenshots.

### Aplicar migrations com revisão

**Na branch desta correção** e a partir de `backend`, primeiro confira a lista local sem mexer no remoto:

```powershell
npx supabase migration list --local
npx supabase test db
```

Em uma sessão **separada**, destinada somente ao staging:

```powershell
npx supabase login
npx supabase link --project-ref <STAGING_PROJECT_REF>
npx supabase migration list --remote
npx supabase db push --dry-run --remote
```

Leia a lista do dry-run e confira se o projeto é **STAGING**. Só depois de backup, revisão e aprovação explícita:

```powershell
npx supabase db push --remote
npx supabase migration list --remote
```

**Não execute esses comandos vinculados ao projeto que contém usuários reais.** Não use `--include-seed` para produção, `supabase db reset --remote`, `migration repair` ou SQL manual para fazer migrations passarem.

**IMPORTANTE:** se o ambiente hospedado já recebeu alterações feitas pelo Dashboard, as migrations podem divergir. Em vez de aplicar cegamente, faça inventário/diff de migrations e concilie as divergências em revisão antes de qualquer `db push`.

## 5. Testes remotos de homologação

Os testes `tests/integration/supabase/storage-rls.real.spec.ts` e `tests/e2e/*.spec.ts` **impedem qualquer conexão de escrita a URLs remotas** (local-only safety guard). Não basta apontar `SUPABASE_URL` para staging: eles irão falhar de propósito.

Para homologação hospedada, criar runner específico com:
- Opt-in explícito `ALLOW_STAGING_TESTS=true` **e** allowlist do Project ref de STAGING;
- Namespace/identificadores e e-mails de QA únicos; mecanismo de limpeza com confirmação;
- Nenhuma rotina perigosa de DB reset, rotatividade de chaves ou alteração de Auth real;
- Tempo limitado e clientes externos mockados/sandbox;
- Uma aprovação de operador antes de criar usuários/Storage no staging.

Enquanto esse runner **não existir e não for aprovado**, executar os testes integrais exclusivamente contra Supabase local. Para staging, usar validação de migration, smoke tests não destrutivos e verificação manual controlada.

## 6. Separar deploy de staging e produção

Proposta de fluxo Git:

```text
feature/fix/*  --> PR + testes automáticos locais
                           |
                        develop  --> CI/CD homologação (Supabase STAGING)
                           |
                      aprovação
                           |
                         main    --> deploy produção (Supabase PROD)
```

Use **GitHub Environments**: `staging` e `production`, cada um com secrets independentes:
- `SUPABASE_ACCESS_TOKEN` (CLI, acesso mínimo);
- `SUPABASE_PROJECT_ID` (ref do projeto específico do ambiente);
- `SUPABASE_DB_PASSWORD`;
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` **somente no runtime servidor** quando necessários.

Para `production`, exija reviewers e aprovação manual antes da aplicação de migrations. Não há pipeline de **deploy remoto** criado nesta branch: o workflow presente é apenas de QA local, deliberadamente sem permissões/segredos de produção.

## 7. Checklist antes de produção

- [ ] Staging e produção são **projetos diferentes** e chaves/refs são distintos.
- [ ] Migrations do repositório refletem o banco real (sem drift).
- [ ] Todas as etapas build/lint/QA-01/QA-02/QA-03 estão verdes em local.
- [ ] Staging passou smoke tests com dados sintéticos e configuração externa apropriada.
- [ ] Backup/restauração testados; responsável e janela de implantação definidos.
- [ ] CORS, URLs, Auth redirect URLs, logs e limites revisados por ambiente.
- [ ] Service role/Secret Key limitada ao servidor, jamais exposta por frontend ou logs.
- [ ] Plano de rollback: para migrations não triviais, criar **migration compensatória**; não apagar scripts históricos.
- [ ] Alterações aprovadas em PR; sem alterações manuais na `main` nem no banco remoto.

Referências: https://supabase.com/docs/guides/deployment/managing-environments, https://supabase.com/docs/guides/deployment/branching e https://supabase.com/docs/guides/local-development/cli-workflows.
