# Arquitetura do backend — InfraMap

> Estado documentado: 11/11/2026. Base de análise: branch refactor/architecture-gemini-20261111, incorporada à branch de documentação docs/architecture-openapi-domain-database-20261111.
>
> Fonte de verdade: arquivos sob backend/src/, migrations versionadas e contratos HTTP em docs/openapi.yaml. Este documento descreve o código existente; funcionalidades planejadas não devem ser confundidas com funcionalidades entregues. Atualizar quando mudar o código.

## 1. Visão geral

InfraMap é um monólito modular REST em Node.js, Express 5 e TypeScript (ES modules/NodeNext), integrado a Supabase Auth, PostgreSQL/PostGIS e Supabase Storage. Testes usam Vitest e Supertest. A análise fotográfica utiliza uma porta de IA com provedores mock, Gemini e HTTP legado.

Decisões arquiteturais:
- Módulos organizados por capacidade de negócio, com DDD seletivo nos módulos de maior complexidade.
- Domain modela conceitos e contratos independentes de HTTP e banco; Application executa casos de uso; Infrastructure implementa persistência e serviços externos; Presentation converte HTTP para operações da aplicação.
- Módulos simples podem adotar controller/service/repository sem camadas artificiais (health e categories).
- A aplicação não usa um container de DI. A composição é explícita em server.ts, routes/index.routes.ts e, no módulo de IA, ai-analysis/infrastructure/ai-analysis.module.ts.
- As regras que exigem atomicidade também são aplicadas em funções PL/pgSQL. NÃO pressupor que todos os casos de uso oferecem atomicidade só por estarem no TypeScript.

## 2. Estrutura real e responsabilidades

| Local | Responsabilidade |
| --- | --- |
| src/server.ts | Carrega ambiente, cria cliente Supabase administrativo e inicia o listener HTTP. |
| src/app.ts | Configura middleware HTTP, JSON, documentação, rotas, fallback 404 e tratamento de erro. |
| src/config/ | Constantes de HTTP, limites, privacidade e ambiente; parte das integrações ainda lê process.env diretamente. |
| src/routes/index.routes.ts | Montagem da maioria das rotas e injeção manual de dependências. |
| src/routes/docs.routes.ts | Swagger UI em /api/docs, lendo docs/openapi.yaml a partir do diretório de execução. |
| src/infrastructure/supabase/ | Clientes auth, public, admin e factory de cliente no contexto do JWT. |
| src/infrastructure/storage/ | Geração de URLs assinadas de fotos. |
| src/infrastructure/ai/ | Factory e provedores mock, Gemini e HTTP legado. |
| src/shared/ | Erros, autenticação, autorização, segurança HTTP, logging, validação Zod e extensões de Request. |
| src/modules/ | Casos de uso, controllers, repositórios e rotas por domínio. |
| supabase/migrations/ | Histórico SQL de tabelas, políticas, functions, triggers, views e correções. |
| tests/ | Testes unitários e de integração; não há suíte E2E no inventário atual. |

### Módulos

| Módulo | Escopo constatado |
| --- | --- |
| health | GET de disponibilidade. |
| identity | Leitura de identidade e perfil, atualização de dados cadastrais (factory existente), desativação e anonimização da própria conta; rotas provisórias de validação. |
| categories | Leitura pública das categorias ativas; serviço dedicado na branch de refatoração. |
| ai-analysis | Upload de 1–3 fotos, criação do rascunho, processamento e consulta do resultado; Gemini, mock e HTTP alternativos. |
| occurrences | Finalização de ocorrência, listas públicas/minhas/admin, detalhes, histórico e URLs de fotos. |
| moderation | Iniciar análise, confirmar/rejeitar, priorizar, iniciar atendimento, resolver, corrigir localização/classificação e criar observações. |
| votes | Contagem, inclusão e remoção de voto de cidadão. |
| notifications | Listar e marcar notificações lidas. |
| administration | Dashboard, administração de administradores MASTER e catálogo de órgãos. |

O nome de arquivo é, preferencialmente, kebab-case com sufixo funcional (ex.: get-my-occurrence.use-case.ts, supabase-identity.repository.ts, identity.routes.ts). Classes e interfaces em PascalCase; variáveis/funções em camelCase; colunas e atributos persistidos/retornados pela API em snake_case quando já definidos em contrato. Não renomear endpoints/colunas apenas para uniformização visual.

## 3. Direção das dependências

~~~text
HTTP / Presentation -> Application -> Domain (entidades, regras, portas)
                              ^             ^
                              |             |
                    Infrastructure implementa contratos
                   (Supabase / Storage / Gemini / mock)

server.ts + index.routes.ts + ai-analysis.module.ts = composition roots
~~~

- Domain não deve importar Express, Zod, Supabase nem detalhes de transporte.
- Application deve depender de ports/interfaces e dados do domínio, sem Request ou Response.
- Presentation recebe dados validados (Zod) e delega; não executa SQL.
- Infrastructure implementa contratos e isola dependências externas.
- Shared só recebe utilitários reutilizáveis sem acoplamento indevido ao domínio.
- DTOs de saída separam os dados internos do contrato público (especialmente caminhos privados e metadados de IA).
- Dependências cíclicas entre modules/occurrences e modules/moderation devem ser evitadas; hoje o caso de uso de histórico depende de uma interface de moderation, passível de extração para porta estável.

Isto descreve a direção-alvo, não uma afirmação de conformidade integral: ainda há módulos com repositórios importados na camada Application e outras exceções documentadas na seção de pendências.

## 4. Inicialização e pipeline HTTP

1. server.ts importa dotenv/config e env.ts, cria o cliente admin e chama createApp.
2. app.ts aplica requestLogger, Helmet, CORS, restrição de métodos, rate limiter e JSON de até 100 KB.
3. Swagger UI é montado em /api/docs; API é montada em /api/v1 via createRoutes.
4. Há um router adicional de desativação de conta em app.ts, após createRoutes.
5. Rotas não encontradas passam por NotFoundError; errorHandler emite estrutura error.code / error.message.

A ordem de montagem importa: caminhos mais específicos devem anteceder parâmetros genéricos. A documentação das rotas efetivamente montadas está em openapi.yaml. A leitura do YAML depende atualmente de process.cwd() apontar para backend.

## 5. Segurança, identidade e privilégios

- authenticate exige Authorization: Bearer <JWT>, valida o token com Supabase Auth e popula req.user / req.token.
- authorize-role consulta as permissões persistidas em user_roles; nunca aceita role enviado pelo cliente como autoridade.
- Os papéis são CITIZEN e ADMIN; ADMIN possui níveis MASTER e OPERATIONAL em user_roles.
- Clientes em infrastructure/supabase: auth-client para validação, public-client para leituras públicas, user-client.factory para acesso no contexto do JWT e admin-client para operações privilegiadas.
- Um cliente administrativo pode ultrapassar RLS. Repositórios e casos de uso que o utilizam DEVEM aplicar filtros por proprietário e checagens explícitas de autorização; RLS não é uma garantia substituta nesse contexto.
- profiles guarda dados cadastrais; user_roles guarda perfil de acesso e estado ativo. Mantê-los separados.
- Nunca registrar JWTs, chaves Supabase, chave Gemini ou fotografias em logs. Supabase Storage usa bucket privado occurrence-photos.
- Regras de SELECT e funções privilegiadas estão detalhadas em database.md; regras de autorização de negócios em domain-rules.md.

### Desativação da conta

DELETE /identity/me solicita desativação de cidadão ativo: revoga sessões, executa transação de anonimização do perfil/papel via RPC e tenta limpar o registro no Supabase Auth. A tabela account_deactivation_jobs permite reprocessar uma falha de limpeza; ocorrências e histórico persistem. A automação de retomada não deve ser presumida apenas pela existência da tabela e do script administrativo.

### Atenção: rotas de perfil ainda divergentes

Na composição existente, GET /identity/me é a rota provisória que devolve id/email; a factory my-profile.routes.ts implementa GET/PATCH de perfil, mas não está montada no roteador principal. Por isso PATCH /identity/me não deve ser anunciado como disponível na instância HTTP atual. Corrigir o registro e garantir testes de regressão antes de alterar o contrato publicado.

## 6. Fluxo das fotografias e da IA

1. POST /api/v1/ai-analyses recebe multipart/form-data com campo photos, de 1 a 3 arquivos JPEG/PNG de até 5 MB por arquivo; bytes e MIME declarado são verificados.
2. As imagens são armazenadas no bucket privado e os caminhos temporários são vinculados a ai_analyses, estado PENDING.
3. POST /ai-analyses/{id}/analyze valida propriedade e estado (PENDING ou FAILED), reserva PROCESSING no banco e responde HTTP 202.
4. O trabalho continua no processo Node.js, sem fila durável. A factory seleciona AI_PROVIDER=mock, gemini ou http; mock é o padrão quando a variável não está presente.
5. Gemini recebe os bytes das fotos baixadas pelo backend e envia conteúdo multimodal inlineData; a resposta estruturada é validada com Zod. A chave fica apenas no servidor.
6. A categoria sugerida usa o limiar AI_CONFIDENCE_THRESHOLD (padrão 0.70); abaixo do limiar, código CAT07. O confidence do LLM é uma estimativa, NÃO uma probabilidade estatisticamente calibrada.
7. O caso de uso persiste COMPLETED (categoria, descrição, modelo, versão de prompt) ou FAILED (código de erro); GET /ai-analyses/{id} devolve DTO sem paths privados.

Risco conhecido: em caso de reinicialização do processo após a reserva, a análise pode permanecer em PROCESSING; falta rotina de recuperação. Não há garantia de execução distribuída nem de retry automático.

## 7. Ciclo da ocorrência

- A finalização POST /occurrences/finalize exige cidadão ativo, uma análise COMPLETED pertencente ao solicitante, categoria ativa, descrição de até 500 caracteres, coordenadas e de 1 a 3 fotos.
- A análise é vinculada a no máximo uma ocorrência (chave UNIQUE em ai_analysis_id). A intenção é tornar a finalização atômica junto ao registro das fotos, consumo da análise e histórico.
- Status do banco: RECEIVED -> UNDER_ANALYSIS -> CONFIRMED -> IN_SERVICE -> RESOLVED; UNDER_ANALYSIS também pode ir para REJECTED.
- A prioridade é LOW / MEDIUM / HIGH e só é aplicada após CONFIRMED; iniciar atendimento exige prioridade e ação concreta.
- location_original é imutável via trigger; location_adjusted guarda correção administrativa.
- Consultas públicas são restritas a CONFIRMED / IN_SERVICE, com localização reduzida. Consultas do autor/admin devem impor escopo adequado.
- Histórico e observações possuem regras distintas de visibilidade; observações INTERNAL não pertencem ao contrato público do cidadão.

**Cuidado:** há inconsistências entre migrations de base e RPCs posteriores (tipos de fonte MANUAL/USER_MANUAL, caminhos temporários, assinaturas e nomes de notificação). Não considerar essas integrações homologadas sem teste de banco. Ver database.md e domain-rules.md.

## 8. Banco e persistência

O banco não é um mero CRUD: algumas funções SQL implementam operações multi-etapas e regras de autorização, e existem permissões RLS, views, grants e triggers. Consulte database.md para entidades, relações, políticas, funções e migrations.

Princípios:
- Migrations já aplicadas NÃO devem ser editadas para corrigir produção. Criar migrations incrementais, testadas em ambiente isolado e aplicadas na ordem.
- Evitar expor location_original e storage_path em endpoints públicos.
- Documentar quem usa JWT do usuário versus cliente admin em cada repositório.
- Avaliar funções SECURITY DEFINER com search_path seguro, grants restritos e parâmetros verificados.

## 9. Qualidade, testes e contratos

- Unitários: testes dos casos de uso, integração HTTP de IA e simuladores de provider, além dos módulos presentes no diretório tests/unit.
- Integração: app, middlewares, identidade, categorias, dashboard, Supabase opcional e rotas de IA.
- Não foi identificada pasta tests/e2e no inventário desta branch; fluxo E2E completo ainda precisa de validação.
- Antes de merge: npm ci; npm run build; npm run lint; npm test; validar OpenAPI 3.1 e conferir DB/RLS em Supabase local de testes.
- Qualquer mudança no endpoint requer atualização sincronizada de Zod, controller, caso de uso, OpenAPI e testes de contrato.

## 10. Pendências técnicas verificadas

| Prioridade | Achado | Próxima intervenção |
| --- | --- | --- |
| P0 | GET/PATCH do perfil não coincidem com especificação anterior; PATCH não está montado. | Unificar rotas sem sobrescrita e cobrir com Supertest. |
| P0 | Há diferenças entre assinatura/colunas/tipos de RPCs SQL e o schema original. | Auditar versões finais e criar migration de correção após validar em Supabase local. |
| P1 | Falhas de regras de negócio ainda podem sair como Error genérico e virar HTTP 500. | Introduzir mapeamento tipado AppError/erros SQL e testar 4xx. |
| P1 | Processamento de IA é best effort em memória. | Implementar recuperação de estado PROCESSING por prazo com retry controlado. |
| P1 | Gemini aceita JPEG/PNG no upload; schema da finalização declara JPG/JPEG. | Alinhar contrato, validação e Storage antes de ampliar formato. |
| P1 | get_occurrence retorna storagePath dentro de photos e getPublic repassa esse array sem projeção; o detalhe público pode expor paths internos. | Aplicar DTO público mínimo e obter foto por identificador seguro, com testes de não exposição. |
| P1 | Caso de uso de finalização importa schema de Presentation. | Mover validação de domínio/DTOs para Application mantendo Zod na borda. |
| P2 | Documentação, README e política de licença requerem uniformização. | Manter contratos consistentes; revisar README e pipeline. |
| P2 | Falta validação de OpenAPI e E2E reais em CI. | Adicionar sem impor dependência de serviços de produção. |

Este documento identifica riscos a partir do código versionado. Não substitui execução de compilação, testes e migrations em ambiente de homologação.
