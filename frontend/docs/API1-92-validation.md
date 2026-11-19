# API1-92 — Gestão de Órgãos (WEB-EXTRA-01)

Branch: feature/web-extra-01-agencies, criada a partir de feature/web-ui-03-admin-map.
Sem merge na main, sem migrations, sem alteração de dados de produção.

## Entrega MVVM

- View: src/features/agencies/pages/agencies-page.tsx e components/agency-form-dialog.tsx.
- ViewModel: src/features/agencies/view-models/use-agencies-management-view-model.ts.
- Model: src/features/agencies/services/agencies.service.ts.
- Integração de leitura: GET /api/v1/admin/agencies; retorna objeto com data contendo lista de órgãos.
- Integrações de escrita: POST /api/v1/admin/agencies e PATCH /api/v1/admin/agencies/:id.
- Campos do backend: id, name, email, phone, description, is_active, created_at e updated_at.
- View com consulta, busca por nome/e-mail, filtro para esconder inativos, atualização, loading, vazio, erros e retry.
- Formulários React Hook Form + Zod com nome (1-150), e-mail válido até 150, telefone até 20 e descrição opcional.
- Desativação precisa de confirmação explícita; reativação é PATCH is_active=true.

## Bloqueio importante: API1-100

GET /admin/me ainda não fornece admin_level confiável na implementação de referência.
Por segurança, a tela fica APENAS CONSULTA sem ele. MASTER confirmado via resposta do backend é condição indispensável para exibir ações e para executar mutation.
Não inferir MASTER de JWT, localStorage, erros HTTP ou consulta a tabelas privadas do Supabase.
O backend requer MASTER em POST/PATCH, independentemente das verificações de UX da tela.

## Dependências e pendências

- API1-60: endpoints de órgãos já implementados no backend.
- API1-100: expor admin_level autenticado e testado em GET /admin/me — A fazer; bloqueia validação de criação/edição/desativação na aplicação.
- API1-97: detalhes de ocorrência e encaminhamentos — A fazer, outro integrante; bloqueia QA de órgão inativo em novo encaminhamento e snapshot de e-mail dos registros antigos.
- Sem mockup oficial para esta tela. O estilo segue o painel existente, mas não há paridade Figma verificada.
- Busca por texto é local sobre o catálogo retornado; não alegar paginação ou busca global no backend.

## Homologação

- [ ] ADMIN ativo acessa /admin/agencies; 401/403 seguem guardas e backend.
- [ ] Catálogo vazio não vira erro nem dados fictícios.
- [ ] Lista com registros reais; buscar por nome/e-mail, esconder inativos, carregar novamente.
- [ ] Administrador sem admin_level tem apenas consulta, sem controles MASTER.
- [ ] API1-100 entregue: MASTER cria, edita, confirma desativação e reativa; OPERATIONAL nunca modifica, inclusive via endpoint.
- [ ] API1-97 entregue: inativos somem das opções de novo encaminhamento; snapshot de e-mail permanece preservado no backend.
- [ ] Validar typecheck, lint, testes e build.

Fonte: FRONT/business/fluxos/admin-gestao.md no repositório Inframap-ai-specs; ticket API1-92.
