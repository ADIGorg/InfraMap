# AGENTS.md — Frontend InfraMap

> Instruções permanentes para o Codex **exclusivamente no frontend** do InfraMap.
> Aplica-se ao aplicativo mobile em React Native e ao portal administrativo web em React.
> O backend e o banco de dados existentes são dependências de integração, **não alvos de alteração**.

## 1. Contexto do produto

O **InfraMap** é um MVP acadêmico para registrar, visualizar, fiscalizar e acompanhar problemas de infraestrutura urbana. O cidadão envia fotografias e localização; uma IA sugere categoria e descrição; administradores moderam e acompanham as ocorrências.

Há dois clientes consumindo **a mesma API REST**:

- **Mobile (cidadão):** React Native; arquitetura **MVVM** (decisão aprovada).
- **Web (administradores):** React; organização modular por funcionalidades é a proposta inicial, a ser ajustada ao código e às decisões da equipe.
- **API existente:** Node.js + TypeScript + Express; MVC na apresentação, monólito modular, N-Layer e DDD seletivo; Supabase Auth, PostgreSQL/PostGIS e Storage.

**TypeScript é preferível nos dois frontends**, mas não migrar automaticamente código JavaScript existente. Verificar decisões e configuração do repositório antes de escolher bibliotecas, roteamento, gerenciamento de estado, mapas, testes ou ferramentas de build.

## 2. Limites de atuação

1. Trabalhar **somente nos arquivos de frontend** abrangidos pela tarefa: `mobile/`, `web/` ou estrutura equivalente que existir no repositório.
2. **Não modificar** API, banco, migrations, políticas RLS, funções SQL, OpenAPI, credenciais ou infraestrutura, a menos que o usuário mude explicitamente o escopo em uma tarefa separada.
3. Não criar endpoints, campos, DTOs, payloads, status, permissões ou respostas fictícias. Primeiro localizar o contrato real.
4. Não adicionar bibliotecas, substituir o stack, reorganizar todo o projeto ou criar abstrações sem justificativa. Antes de introduzir dependência nova ou mudança estrutural ampla, explicar o motivo e pedir aprovação.
5. Não executar `git commit`, `push`, deploy, publicação em loja nem ações destrutivas sem solicitação explícita.
6. Não implementar itens classificados como **fora do escopo** do MVP. Funcionalidades opcionais (P1) somente quando solicitadas.

## 3. Fontes de verdade e descoberta

Antes de implementar uma funcionalidade, **inspecionar o repositório real**. Não presumir que os diretórios ou arquivos a seguir existam. Se estiverem disponíveis, consultar os relevantes:

- `docs/backend/00-INDEX.md` — índice e hierarquia documental.
- `docs/backend/01-PROJECT-CONTEXT.md` — propósito, atores e MVP.
- `docs/backend/03-BUSINESS-RULES.md` — fluxo de ocorrências, validações e permissões.
- `docs/backend/05-API-CONTRACTS.md` — contrato conceitual REST.
- `docs/backend/06-SECURITY-AND-PERMISSIONS.md` — Auth, JWT, papéis, privacidade.
- `docs/backend/07-INTEGRATIONS.md` — IA, Storage e notificações.
- `docs/backend/10-DECISIONS-AND-CONSTRAINTS.md` — decisões aprovadas e limites do escopo.
- `docs/backend/11-IMPLEMENTATION-NOTES.md` — divergências aprovadas e correções efetivamente aplicadas.
- `docs/frontend/` — decisões específicas dos clientes, se houver.
- `backend/docs/openapi.yaml` ou `docs/openapi.yaml` — **contrato efetivamente implementado**, se estiver acessível.

O backend pode estar em outro repositório. Se o OpenAPI não estiver disponível, indicar quais contratos faltam e evitar integração baseada em suposições; é possível implementar UI isolada com mocks **claramente identificados como temporários**, quando o usuário solicitar.

Hierarquia conceitual dos anexos: **10 > 02 > 03 > 05 > 04 > ticket > código existente**. O documento 11 registra desvios já implementados e testados que precisam ser considerados. Para consumir a API, conferir também o OpenAPI atual e os comportamentos verificados; em divergência importante, **reportar, não improvisar**.

## 4. Arquitetura do aplicativo mobile — React Native + MVVM

Separar responsabilidades por funcionalidade, sem impor uma árvore de pastas artificial:

- **View:** telas e componentes; renderização, acessibilidade e delegação de eventos. Não realizar chamadas HTTP diretamente na tela.
- **ViewModel:** coordena estado de apresentação (loading, erro, formulário, operações assíncronas, retry e navegação quando apropriado). Pode usar hooks customizados. Não contém regras de negócio autoritativas.
- **Model / serviços / repositórios:** tipos dos dados, mapeamento dos DTOs e comunicação com a API. Evitar camadas duplicadas sem benefício.

Preferir módulos coesos, como `auth`, `occurrences`, `ai-analysis`, `maps`, `votes`, `notifications` e `profile`, respeitando a estrutura que já existir. Manter componentes compartilháveis fora dos módulos somente quando houver reutilização real.

## 5. Arquitetura do portal web — React

- Preferir **organização modular por funcionalidade**, mantendo páginas, componentes, hooks e serviços próximos da funcionalidade a que pertencem.
- Separar componentes visuais, estado de apresentação e chamadas HTTP. Evitar componentes que concentrem toda a lógica do portal.
- Implantar rotas protegidas e ações condicionais por papel e nível administrativo, sem substituir a autorização do servidor.
- Manter layout responsivo, acessibilidade, feedback e consistência visual. Não impor MVVM ao portal web sem decisão explícita da equipe.
- Módulos principais: `auth`, `dashboard`, `occurrences`, `moderation`, `maps` e `administration`.

## 6. Contrato HTTP e sessão

- Base conceitual da API: **`/api/v1`**. Base URL configurável por ambiente; nunca fixar localhost de maneira que impossibilite acesso pelo emulador/dispositivo.
- Autenticação de rotas protegidas: `Authorization: Bearer <jwt>`.
- Verificar os payloads reais de `/identity/login`, `/identity/refresh`, `/identity/logout`, `/identity/me` e `/identity/register` antes de implementar sessão, renovação e persistência.
- Escolher armazenamento apropriado para credenciais/sessão conforme a plataforma; **não persistir tokens sensíveis sem avaliar a segurança**. Nunca expor senha, refresh token, JWT, chaves secretas ou PII em logs e mensagens de debug.
- Tratar respostas não autenticadas e conta inativa: **401** (sem autenticação válida) e **403** (sem permissão ou conta inativa). Não presumir privilégio a partir do estado local da interface.
- Erro padrão documentado: `{ "error": { "code": "...", "message": "..." } }`.
- Paginação documentada: `{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 } }`.
- Tratar no mínimo: loading, sucesso, vazio, erro, retry, 400, 401, 403, 404, 409, 413, 429 e 500 conforme o fluxo.
- **Não acessar diretamente as tabelas privadas do Supabase** a partir do frontend para contornar a API. Não usar `service_role` ou `SUPABASE_SECRET_KEY` nos clientes. Fotos privadas devem seguir as URLs assinadas/fluxos definidos pela API.

## 7. Regras que a interface deve respeitar

### Identidade e autorização

- Cadastro público é sempre `CITIZEN`; **não enviar `role`/`admin_level` como forma de escolher privilégio**.
- `CITIZEN`: registra e acompanha as próprias ocorrências, vota e acessa suas notificações.
- `ADMIN` + `OPERATIONAL`: modera, prioriza, inicia e conclui atendimentos, vê dashboard.
- `ADMIN` + `MASTER`: funcionalidades operacionais **e** gerenciamento de administradores.
- O backend decide autorização; o frontend apenas adapta navegação e ações para uma boa UX.

### Ocorrências e IA

- Registro requer **1 a 3 fotos JPEG/PNG, até 5 MB cada**, descrição de até **500 caracteres**, categoria e localização.
- A criação da ocorrência pressupõe **análise de IA `COMPLETED`** do cidadão; processamento é assíncrono (`202`) e pode falhar. Permitir acompanhar, tentar novamente quando cabível e revisar sugestões. **Não criar bypass manual de IA**.
- IA sugere categoria, descrição e confiança `[0,1]`; limiar documentado `0,70`, com sugestão `CAT07` abaixo dele. A revisão do cidadão não substitui a moderação administrativa.
- Estado inicial: `RECEIVED`.
- Transições: `RECEIVED → UNDER_ANALYSIS → CONFIRMED → IN_SERVICE → RESOLVED`; de `UNDER_ANALYSIS` também pode ocorrer `REJECTED` com justificativa. Estados `RESOLVED` e `REJECTED` são terminais.
- Prioridade `LOW | MEDIUM | HIGH` somente após `CONFIRMED`; início do atendimento exige prioridade e ação concreta. Não oferecer controles de transições inválidas.

### Mapas, votos, fotos e privacidade

- Mapa público mostra **somente `CONFIRMED` e `IN_SERVICE`**, com **coordenadas aproximadas** fornecidas pela API.
- Nunca exibir dados administrativos ou privados (autor, coordenada original exata, prioridade, observações `INTERNAL`, paths internos do Storage) em páginas públicas.
- Foto original no detalhe público **somente** para `CONFIRMED`/`IN_SERVICE`, via URL assinada da API.
- Mapa administrativo: ocorrências não resolvidas podem ser pontos ativos; `RESOLVED` permanece em listagens/histórico. Respeitar filtros e dados entregues pelo endpoint administrativo.
- Votos: apenas cidadão autenticado, sem auto-voto, **um voto por ocorrência**, apenas em `CONFIRMED`/`IN_SERVICE`; retirada permitida. O frontend não é a autoridade para validar essa regra.
- Notificações são persistentes e consultadas por REST; Realtime é **opcional**, não requisito para funcionamento.

## 8. UX, qualidade e testes

- Interfaces em **português brasileiro**, com mensagens úteis, estados vazios, carregamento visível, possibilidade de recuperação de erros e acessibilidade básica (rótulos, foco/teclado, área de toque, contraste).
- Validar formulários no cliente para orientar o usuário, mas considerar a **API como autoridade** das regras.
- Usar os padrões existentes do repositório (nomes, lint, formatação, navegação, testes); não instalar ferramentas apenas por preferência.
- Priorizar testes de comportamento de ViewModels/hooks, formulários, autenticação/sessão, permissões, tratamento de falhas, IA assíncrona e serviços HTTP; integrar e testar conforme o tooling real do projeto.
- Não declarar tarefa concluída sem informar quais verificações foram executadas. Se não foi possível rodar build/testes/lint, dizer expressamente o motivo.
- Não usar dados reais sensíveis em fixtures, screenshots ou exemplos.

## 9. Fluxo de trabalho esperado do Codex

1. **Identificar** o cliente (mobile ou web), a funcionalidade, o escopo e os critérios de aceite do pedido.
2. **Inspecionar** os arquivos existentes, comandos de desenvolvimento e testes, e o contrato da API relevante.
3. **Resumir brevemente** o plano e os arquivos afetados. Em pedido somente de planejamento, não alterar arquivos.
4. **Implementar incrementalmente**, preservando decisões existentes e evitando mudanças fora do módulo solicitado.
5. **Verificar** tipos, lint, testes e build disponíveis; revisar o diff e não incluir segredos.
6. **Relatar** arquivos alterados, comportamento entregue, comandos/testes executados, resultados e pendências.
7. Se faltar contrato essencial ou houver contradição material, **interromper apenas a parte incerta** e explicar exatamente o impedimento, sem inventar integração.

**Não é permitido modificar backend ou infraestrutura para fazer uma tela funcionar.** Quando a API não fornecer algo necessário, documentar a lacuna para a equipe responsável pelo backend.
