# InfraMap — Backend API

API REST modular do InfraMap para denúncias urbanas georreferenciadas, moderação administrativa, fotos privadas, análise de IA e acompanhamento comunitário. **Node.js >=22.12, Express 5, TypeScript NodeNext, Zod, Supabase/PostgreSQL/PostGIS/Auth/Storage e Vitest.**

Esta documentação corresponde ao código da branch de correção baseada na main de 14/11/2026. A branch **não executa deploy** no Supabase hospedado nem modifica a main. Consulte [limitações e homologação](docs/known-limitations.md).

## Índice da documentação

| Documento | Abrangência |
|---|---|
| [Arquitetura](docs/architecture.md) | Camadas, dependências, segurança, regras e fluxos |
| [Módulos e API](docs/modules-and-api.md) | Todos os módulos, endpoints, papéis e regras |
| [Banco e segurança](docs/database-and-security.md) | Tabelas, enums, RPCs, triggers, RLS, grants e migrations |
| [Separação Supabase local/staging/prod](docs/supabase-environments.md) | **Passo a passo** Windows e Dashboard; link, dry-run, deploy seguro, secrets |
| [QA, CI e operação](docs/qa-and-operations.md) | Scripts, Vitest, 225 pgTAP, Auth/Storage/E2E, GitHub Actions, diagnóstico |
| [Limitações e backlog](docs/known-limitations.md) | Integração Storage/SQL, IA async, Gemini, filtros, câmera, deploy |
| [OpenAPI](docs/openapi.yaml) | Especificação HTTP; comparar com schemas Zod em cada PR |
| [Plano QA original](docs/qa-sprint2.md) | Diagnóstico histórico e evidências de QA da main antes das correções |

## Executar localmente

```powershell
cd backend
npm ci
# configurar .env PRIVADO a partir de .env.example (sem credenciais versionadas)
npm run dev
```

Liveness: `GET http://localhost:3000/api/v1/health`. Swagger UI: `http://localhost:3000/api/docs`.

Para iniciar PostgreSQL, Auth e Storage locais: abra o Docker Desktop e execute `npx supabase start --exclude studio,mailpit,logflare,vector,imgproxy,edge-runtime`. Use a URL e as chaves do **Supabase LOCAL**, obtidas com `npx supabase status` e configuradas no mesmo terminal PowerShell. O arquivo `.env` de produção **não** deve ser utilizado por testes.

Scripts de qualidade:

```powershell
npm run build
npm run lint
npm run test:unit
npm run test:integration
# requer supabase start:
npm run test:db
npm run test:db-integration
npm run test:e2e
```

O comando `npm run test:qa` executa os scripts sequencialmente após as variáveis e containers locais estarem configurados. Integrações reais recusam hostname não-local por padrão, para proteger bancos hospedados.

## Política de contribuições

- Pull request em branch dedicada; não commitar diretamente na main e não modificar migrations históricas.
- Implementações Supabase na camada `infrastructure`, contratos em `domain`; NodeNext usa sufixo `.js`.
- Toda alteração Auth, RLS, RPC, Storage ou endpoint requer teste de autorização negativa e atualização de OpenAPI.
- Nunca commitar segredo/JWT, nem expor Secret Key a frontend/mobile; segredos hospedados em secret store.
- Staging e produção devem ser **projetos Supabase separados**; apenas um operador autorizado aplica migrations remotas com dry-run e backups.

**Situação:** a branch de correção executa QA em Supabase local; o estado remoto do projeto Supabase existente precisa de inventário/homologação antes de qualquer implantação.
