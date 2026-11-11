# InfraMap API

API REST do InfraMap, construída com Node.js, Express e TypeScript. Nesta primeira fase, a API disponibiliza o health check, autenticação e autorização baseadas no Supabase Auth e em `user_roles`, validação de requisições com Zod, tratamento centralizado de erros, segurança HTTP e logging estruturado.

> **Estado do projeto:** alguns endpoints de identidade ainda são estruturas iniciais de validação ou demonstração. Eles não representam necessariamente operações completas de cadastro ou consulta ao banco. Consulte a seção [Endpoints](#endpoints) antes de integrá-los a um cliente.

## Requisitos

- Node.js 22 ou superior.
- npm.
- Projeto Supabase acessível, com Auth e as tabelas/migrações necessárias para `user_roles` e `profiles`.
- Git.

A dependência `@supabase/supabase-js` utilizada pelo projeto requer Node.js 22 ou superior.

## Instalação e execução

1. Clone o repositório e entre na pasta da API:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd InfraMap/backend
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo local de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

4. Edite `.env` e informe os dados do seu projeto Supabase. Não compartilhe nem versione esse arquivo.

5. Inicie em desenvolvimento:

   ```bash
   npm run dev
   ```

Por padrão, a API escuta na porta `3000`. O health check pode ser acessado em:

```text
http://localhost:3000/api/v1/health
```

### Scripts disponíveis

| Comando | Finalidade |
|---|---|
| `npm run dev` | Executa a API em desenvolvimento com reinicialização automática via `tsx watch`. |
| `npm run build` | Compila o TypeScript para `dist/`. |
| `npm start` | Executa a versão compilada em modo de produção. Execute `npm run build` antes. |
| `npm test` | Executa os testes automatizados com Vitest. |
| `npm run test:watch` | Executa o Vitest em modo de observação. |
| `npm run lint` | Analisa o código com ESLint. |

Validação recomendada antes de abrir um pull request:

```bash
npm test
npm run build
npm run lint
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável | Obrigatória | Descrição | Exemplo |
|---|---:|---|---|
| `SUPABASE_URL` | Sim | URL do projeto Supabase. | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Sim | Chave publicável do projeto Supabase, usada pelo cliente da API. | `sb_publishable_...` |
| `PORT` | Não | Porta HTTP. Padrão: `3000`. | `3000` |
| `NODE_ENV` | Não | Ambiente de execução. Padrão: `development`. | `development` |
| `CORS_ALLOWED_ORIGINS` | Não | Lista de origens autorizadas pelo CORS, separadas por vírgula. | `http://localhost:5173` |
| `LOG_LEVEL` | Não | Nível mínimo de logging do Pino. | `debug`, `info`, `warn` ou `error` |

`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` são verificadas na inicialização. `PORT` e `NODE_ENV` possuem valores padrão. `CORS_ALLOWED_ORIGINS` e `LOG_LEVEL` configuram, respectivamente, a política de CORS e o nível de logs.

**Segurança:** não coloque tokens de usuário, senhas, chaves secretas ou credenciais privilegiadas no README, no `.env.example` ou no controle de versão. O arquivo `.env` deve permanecer ignorado pelo Git. A aplicação usa a chave publicável e o JWT do usuário autenticado; não exponha uma `service_role` key ao aplicativo móvel ou ao painel administrativo.

## Arquitetura e organização dos pacotes

A API segue uma organização modular, separando configuração, rotas, módulos de negócio, infraestrutura e componentes compartilhados.

```text
backend/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── infrastructure/
│   │   └── supabase/
│   │       ├── auth-client.ts
│   │       └── user-client.factory.ts
│   ├── modules/
│   │   ├── health/
│   │   │   ├── health.controller.ts
│   │   │   └── health.routes.ts
│   │   └── identity/
│   │       ├── identity.controller.ts
│   │       ├── identity.repository.ts
│   │       ├── identity.routes.ts
│   │       ├── identity.schema.ts
│   │       └── identity.service.ts
│   ├── routes/
│   │   └── index.routes.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   └── app-error.ts
│   │   ├── logger/
│   │   │   └── logger.ts
│   │   ├── middlewares/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize-role.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── http-security.ts
│   │   │   ├── request-logger.ts
│   │   │   └── validate-request.ts
│   │   └── types/
│   │       └── express.d.ts
│   ├── app.ts
│   └── server.ts
├── docs/
│   └── openapi.yaml
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

### Responsabilidades

- **`config/`**: carrega e valida as variáveis de ambiente.
- **`infrastructure/supabase/`**: centraliza os clientes Supabase. O cliente de usuário encaminha o JWT recebido para que as políticas RLS do banco sejam aplicadas.
- **`modules/`**: agrupa as funcionalidades por domínio. `health` disponibiliza a verificação de saúde; `identity` concentra os endpoints, schemas, controller, serviço e acesso a `user_roles` relativos à identidade.
- **`routes/`**: reúne os roteadores dos módulos e aplica os prefixos da API.
- **`shared/errors/`**: define os erros padronizados da aplicação.
- **`shared/middlewares/`**: contém autenticação, autorização, validação, segurança HTTP, logging de requisições e tratamento de erros.
- **`shared/logger/`**: configura o logger Pino.
- **`app.ts`**: configura o Express e a ordem dos middlewares.
- **`server.ts`**: inicia o servidor HTTP.
- **`tests/`**: contém testes automatizados com Vitest e Supertest.

## Endpoints

A URL-base local é `http://localhost:3000/api/v1`. As respostas de erro seguem, em geral, o formato:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Autenticação necessária."
  }
}
```

### Health check

| Método | Caminho | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/health` | Não | Verifica se a API está respondendo. |

Resposta `200`:

```json
{
  "status": "ok",
  "message": "InfraMap API funcionando!",
  "timestamp": "2026-11-04T12:00:00.000Z"
}
```

O campo `timestamp` é gerado pela aplicação.

### Identidade — endpoints iniciais

As rotas deste grupo são montadas sob `/identity`.

| Método | Caminho | Acesso | Comportamento atual |
|---|---|---|---|
| `GET` | `/identity/me` | Bearer JWT válido | Retorna o identificador e o e-mail do usuário autenticado. |
| `GET` | `/identity/admin-check` | ADMIN ativo | Confirma que a autorização administrativa foi aprovada. |
| `POST` | `/identity/users` | ADMIN ativo | Valida o body de criação de usuário, mas ainda não cria um usuário no Supabase. **Endpoint provisório.** |
| `GET` | `/identity/users` | Bearer JWT válido | Valida os parâmetros de paginação e retorna os valores validados; ainda não lista usuários. **Endpoint provisório.** |
| `GET` | `/identity/users/{id}` | Bearer JWT válido | Valida o identificador da URL; ainda não consulta um usuário no banco. **Endpoint provisório.** |

O schema de `POST /identity/users` está em `src/modules/identity/identity.schema.ts`. O schema de listagem aceita os parâmetros de consulta definidos em `getUsersQuerySchema`; consulte esse arquivo para os limites e valores padrão vigentes. O parâmetro `id` é validado como UUID.

Endpoint provisório: POST /identity/users valida os dados recebidos, mas ainda não cria usuários no Supabase. A resposta não inclui senha nem outros dados cadastrais enviados. O endpoint permanece reservado ao perfil ADMIN.

### Identidade — contexto do aplicativo e do painel administrativo

| Método | Caminho | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/app/me` | CITIZEN ativo | Retorna a identidade e a situação da conta do cidadão autenticado. |
| `GET` | `/admin/me` | ADMIN ativo | Retorna a identidade e a situação da conta do administrador autenticado. |

Resposta `200` de `/app/me` (exemplo):

```json
{
  "id": "00000000-0000-4000-8000-000000000000",
  "role": "CITIZEN",
  "is_active": true
}
```

Para `/admin/me`, o campo `role` possui o valor `ADMIN`.

Esses endpoints verificam o token, o papel registrado em `user_roles` e a situação da conta. Uma conta sem perfil, inativa ou com papel incompatível recebe `403 Forbidden`.

### Códigos HTTP comuns

| Código | Significado |
|---:|---|
| `200` | Requisição concluída. |
| `201` | Requisição aceita pela rota provisória de validação de cadastro; não significa que o usuário foi persistido. |
| `400` | Dados inválidos ou JSON malformado. |
| `401` | Token ausente, malformado, inválido ou expirado. |
| `403` | Usuário autenticado sem perfil ativo ou sem papel autorizado. |
| `404` | Rota ou recurso não encontrado. |
| `409` | Conflito de operação, quando aplicável. |
| `413` | Corpo da requisição acima do limite configurado. |
| `429` | Limite de requisições excedido. |
| `500` | Erro interno inesperado. A mensagem e os detalhes internos não são expostos. |

O parser JSON limita o corpo da requisição a 100 KB. A camada HTTP também configura Helmet, CORS, restrição de métodos e rate limit.

## Autenticação Bearer JWT

As rotas protegidas esperam um access token JWT emitido pelo Supabase Auth no cabeçalho `Authorization`:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

O middleware `authenticate` extrai o token e valida sua autenticidade usando `supabaseAuth.auth.getUser(token)`. Quando válido, disponibiliza o usuário em `req.user` e o token em `req.token` para os middlewares seguintes.

O middleware `authorizeRole` consulta `user_roles` usando um cliente Supabase associado ao JWT do próprio usuário. A consulta verifica `role` e `is_active`; o papel não é aceito a partir de dados enviados pelo frontend. As políticas RLS do Supabase continuam sendo aplicadas.

Papéis utilizados nesta fase:

- `CITIZEN`: cidadão.
- `ADMIN`: administrador.

Exemplo com cURL:

```bash
curl http://localhost:3000/api/v1/app/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Não coloque access tokens em URLs, logs, commits ou exemplos reais de documentação. Não utilize uma chave privilegiada do Supabase como Bearer token de usuário.

## Especificação OpenAPI

A especificação dos endpoints está em [`docs/openapi.yaml`](docs/openapi.yaml). Ela pode ser aberta em ferramentas compatíveis com OpenAPI 3.1, como Swagger Editor ou Swagger UI.

## Testes

Os testes utilizam Vitest e Supertest. Os testes automatizados utilizam mocks quando apropriado e não dependem de credenciais reais versionadas.

```bash
npm test
```

Existe um teste opcional de integração com Supabase Auth, desativado por padrão. Para executá-lo, configure as variáveis necessárias no ambiente local e defina `RUN_SUPABASE_INTEGRATION=true`; não adicione credenciais ao repositório.

## Contribuição

- Não versione `.env`, tokens, senhas ou chaves privadas.
- Atualize `docs/openapi.yaml` e este README quando alterar contratos públicos.
- Execute testes, build e lint antes de abrir um pull request.
- Mantenha as validações de autorização no backend e as políticas RLS no Supabase.


---

## Revisão arquitetural e provedor Gemini (11/11/2026)

A refatoração de arquitetura está documentada em [docs/refactor-audit.md](docs/refactor-audit.md).
O módulo `ai-analysis` separa rotas, controller, validação, casos de uso,
DTOs e repositório; `categories` utiliza um serviço entre controller e repositório.

### Configurar o Gemini

1. Copie `.env.example` para `.env`.
2. Configure `AI_PROVIDER=gemini`, `GEMINI_API_KEY` e
   `AI_MODEL=gemini-3.5-flash-lite` (confirme o acesso ao modelo no Google AI Studio).
3. Para testes sem chamadas externas, selecione `AI_PROVIDER=mock`.
4. Nunca compartilhe a chave da API ou envie fotos reais contendo dados pessoais
   enquanto o tratamento de privacidade e as condições do plano gratuito
   não estiverem validados.

O backend consulta imagens privadas do Supabase Storage e envia os bytes
diretamente ao Gemini (não compartilha URLs assinadas na chamada Gemini).
A saída é validada com Zod e o fallback de categoria CAT07 aplica-se para
confiança menor que 0,70. A confiança é fornecida pelo modelo e não é
uma probabilidade calibrada.

### Verificações obrigatórias antes de integrar

```bash
cd backend
npm ci
npm run build
npm run lint
npm test
```

A análise permanece executada em memória após o retorno HTTP 202.
O banco registra PROCESSING antes desse retorno, mas uma interrupção do
servidor ainda exige uma rotina de recuperação apropriada.
Testes com Supabase e fotos devem ser feitos apenas em ambiente de teste autorizado.
