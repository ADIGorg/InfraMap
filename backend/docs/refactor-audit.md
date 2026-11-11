# Revisão arquitetural — InfraMap (11/11/2026)

## Escopo e base

Branch de origem: `main` no commit `ae9230391921d974b481845a26ae159288fcbced`.
Branch de trabalho: `refactor/architecture-gemini-20261111`.
Revisão estrutural de módulos, responsabilidades, dependências, integrações e testes.
**Não é certificação de segurança nem execução de testes E2E**.

Arquitetura de referência: monólito modular, N-Layer, DDD seletivo,
controller/service/repository nos módulos simples, casos de uso nos complexos.

## Alterações realizadas

1. `ai-analysis`: controlador HTTP, schema Zod, DTO explícito de consulta,
   `GetAiAnalysisUseCase`, entidade de estado e porta do provider na aplicação.
2. `ai-analysis`: único router e implementação Supabase consolidada, sem alterar
   `POST /ai-analyses`, `POST /ai-analyses/:id/analyze` e `GET /ai-analyses/:id`.
3. Corrigida a aceitação antecipada do processamento: a reserva condicional
   `PENDING/FAILED → PROCESSING` é persistida antes do HTTP 202.
4. Gemini multimodal em `GeminiAiProvider`: fotos do bucket privado obtidas
   pelo servidor e enviadas como `inlineData` (nunca URLs de acesso público);
   saída JSON validada; tratamento de indisponibilidade e limite de requisições.
   O mock permanece disponível e o HTTP legado pode ser selecionado explicitamente.
5. `categories`: `CategoriesService` separa apresentação e consulta de dados,
   preservando a assinatura da factory e os contratos da API.

## Padrões adotados e recomendados

- **DTO por contrato HTTP**: não expor caminhos privados do Storage, chaves ou
  estruturas internas de persistência nas respostas.
- **Ports and Adapters**: `AiAnalysisProvider` na aplicação; implementações
  Gemini/mock/HTTP na infraestrutura.
- **Use Case**: regras e autorização contextual (propriedade da análise), não no controller.
- **Repository**: persistência por agregado, métodos condicionais por `user_id`.
- **Factory/DI leve**: sem container de injeção externo; composição explícita.
- **Zod**: limites nas bordas HTTP e na resposta estruturada da IA.
- **MVC**: router declara recursos, controller adapta HTTP, use case processa a regra.

## Achados e pendências identificadas

### Alta prioridade: não resolvidos nesta refatoração

- O processamento em memória pode permanecer `PROCESSING` se o processo
  Node.js reiniciar. Implementar recuperação controlada por timestamp e
  política de timeout, com testes, em tarefa própria; não adicionar fila
  distribuída fora do MVP.
- A confiança retornada por LLM é **autoavaliação não calibrada**; não tratar
  0,70 como probabilidade estatística sem avaliação do conjunto de validação.
- Avaliar o fluxo completo de `finalize-occurrence` e a política de fotos:
  há schema de ocorrência aceitando JPEG, mas não PNG; a especificação do
  produto permite ambos. Revisar regras de negócio e testes antes de alterar.
- Verificar com Supabase real, em ambiente de teste autorizado, RLS, Storage,
  transições e proteção contra acesso cruzado. Não executar contra produção.
- Conferir funcionamento da modalidade gratuita do Gemini e as condições
  de uso/privacidade antes de processar fotografias reais de cidadãos.

### Média prioridade: refactors posteriores

- `identity`: os modelos atuais `UserProfile` (papel/status) e
  `AccountProfile` (cadastro) representam projeções diferentes; não
  consolidar automaticamente. Preservar o gateway Supabase Auth separado
  do repositório relacional.
- `identity` e `administration`: revisar fronteira do gerenciamento de
  administradores para evitar regras duplicadas.
- `occurrences` e `moderation`: definir posse única das regras de
  transição da ocorrência e evitar dependências circulares.
- `votes`, `notifications`, `administration`: manter camadas apenas
  onde elas agregam valor; estrutura final idealizada não é regra rígida.
- Centralizar padrões de DTO, nomenclatura snake_case/camelCase,
  paginação e schemas compartilhados somente quando houver uso real.
- Migrar gradualmente os endpoints provisórios de `identity` para seus
  tickets funcionais, sem modificar contratos em refactors cosméticos.

## Verificações

Testes unitários adicionais criados para Gemini, leitura e reserva de estado.
Os testes foram preparados para execução local; conexão GitHub disponível aqui
não fornece um executor Node/npm, por isso ainda é obrigatório rodar
`npm ci`, `npm run build`, `npm run lint` e `npm test` antes do merge.

Nenhuma migration antiga foi modificada. Nenhuma chave de IA deve ser
registrada no repositório. Uma chave Gemini é necessária somente para
análises reais; testes usam mocks e não consomem cota.
