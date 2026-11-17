# InfraMap — Admin Web | Sprint 3

Aplicação administrativa React + Vite + TypeScript, com arquitetura MVVM por feature. A primeira etapa é API1-91, criada em branch exclusiva. Não altera backend, Supabase nem main.

## Iniciar localmente

1. Instale Node.js 20+ e npm.
2. Abra a pasta frontend.
3. Copie .env.example para .env e configure VITE_API_BASE_URL, VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
4. Configure o CORS do backend para http://localhost:5173 e utilize preferencialmente um Supabase de homologação ou local.
5. Execute npm install e npm run dev.
6. Acesse http://localhost:5173/login com um usuário ADMIN ativo.

Somente a chave PUBLICÁVEL do Supabase pode ir no Vite; nunca adicione service_role, Gemini ou segredos de SMTP ao frontend. Chaves VITE_* são públicas. A chave do Google Maps deve ser restrita pelo domínio e API antes da API1-95.

## Verificações

- npm run typecheck
- npm run lint
- npm test
- npm run build

## Estrutura

- src/features/*/pages: Views
- src/features/*/view-models: hooks ViewModels e ações de apresentação
- src/features/*/services: Model, acesso à API e validação de DTO
- src/infrastructure/api: cliente Supabase Auth e transporte HTTP Bearer
- src/routes: composição e guardas ProtectedRoute e MasterRoute
- src/layouts: AuthLayout e AdminLayout
- src/shared: componentes, estados de UI, tipos e design tokens
- TanStack Query: cache de dados de servidor; Zustand: UI global; Auth Context: sessão.

O endpoint /admin/me devolve objeto direto e não envelope data. O backend decide role e is_active; frontend nunca se autoriza usando claims do JWT. Até a conclusão da API1-100, admin_level não existe no contrato e rotas MASTER negam por padrão.

Em 401, o cliente tenta renovar a sessão uma única vez e apenas repete automaticamente GET. 403 não gera refresh; mutações nunca recebem retry automático. Logout e troca de conta limpam Query Client e Zustand.

## Limites desta entrega

As rotas de dashboard, mapa, lista, notificações e gestão estão ligadas, mas apresentam placeholders intencionais, sem dados falsos. Cada tela será implementada na sua própria branch, com ticket individual:

- API1-93: login aprimorado e recuperação web por confirmação explícita; conferir frontend/docs/API1-93-validation.md. A configuração compartilhada de e-mail no Supabase ainda exige homologação manual.
- API1-94: dashboard e indicadores SLA (série diária depende da API1-103).
- API1-95: mapa, filtros e ajuste de localização (filtros extras dependem da API1-104).
- API1-92: gestão de órgãos; MASTER para operações de escrita.
- API1-99: gestão de admins; depende de API1-100.
- API1-96, API1-97 e API1-98: outras telas por responsáveis.

Os screenshots recebidos orientam o visual. Os exports JSON originais do Figma não estão presentes no ai-specs; os tokens reproduzidos foram documentados manualmente. Não alegar conformidade Figma pixel-perfect.

## Documentação canônica

Repositório ADIGorg/Inframap-ai-specs, pasta FRONT; regras RN001–RN070. Consultar código real da API para resolver divergências com OpenAPI.

Nenhuma migration foi aplicada. Para validação efetiva da integração será necessário um ambiente Supabase com dados reais de testes e o backend funcionando.

## API1-93: login e recuperação via e-mail

A branch feature/web-ui-01-login-admin herda a API1-91 sem modificar main. O login protege rotas e valida ADMIN ativo na API. A recuperação web passa pela rota /confirm-recovery e só verifica o token após clique em Continuar recuperação. A rota /reset-password exige essa etapa anterior para oferecer o formulário.

ATENÇÃO: o Supabase compartilhado usa o mesmo modelo de e-mail para web e mobile. O template condicional está documentado em frontend/docs/supabase-password-recovery-template.html e não foi aplicado ao serviço remoto nesta implementação. Não ativar o modelo sem verificar a preservação dos deep links mobile. Antes de testar end-to-end, adicionar a Redirect URL http://localhost:5173/confirm-recovery e aprovar o template com o responsável pelo mobile.

## API1-94: dashboard administrativo real

A branch feature/web-ui-02-dashboard implementa seis contadores de status, total HIGH, média de resolução, 2 alertas SLA e as 5 ocorrências mais recentes com polling de 30 segundos. Não existem dados simulados. A série diária do gráfico depende da API1-103 e fica explicitamente indisponível. Ver frontend/docs/API1-94-validation.md.

## API1-95 — Mapa Administrativo

Branch feature/web-ui-03-admin-map: tela MVVM com filtros ativos, paginação, bbox, popup, correção confirmada e fallback textual. Veja frontend/docs/API1-95-validation.md para configuração segura do Google Maps e checklist de QA.
