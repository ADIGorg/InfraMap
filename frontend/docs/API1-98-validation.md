# API1-98 — Notificações administrativas derivadas

Rota: `/admin/notifications`, sob `ProtectedRoute` e `AdminLayout`.

## Arquitetura e fontes

- View: `features/notifications/pages/admin-notifications-page.tsx`.
- Lista visual: `components/admin-alert-list.tsx`.
- ViewModel: `view-models/use-admin-notifications-view-model.ts`.
- Model: `services/admin-notifications.service.ts`, reutilizando `AdminOccurrencesService` e o serviço de dashboard com validação Zod existente.
- GET `/admin/occurrences?page=N&pageSize=20&sort=recent`: registros paginados, identificados pelo UUID completo e datados por `createdAt` em America/Sao_Paulo. Não interpreta mudanças de status como eventos novos.
- GET `/admin/dashboard`: duas contagens atuais de SLA. Zero não gera alerta. Cada fonte apresenta sua própria data de última consulta bem-sucedida.

Polling de 30 segundos apenas enquanto a tela tem observer ativo, sem polling em segundo plano. Desmontagem remove os observers; offline pausa as queries. Falha de uma fonte não oculta a outra e não é apresentada como estado vazio. Dados anteriores são identificados como possivelmente desatualizados em caso de falha.

Deduplicação por UUID para ocorrências e por tipo para SLA, sem acumular uma cópia por refetch. Os alertas de SLA aparecem em todas as páginas. Como não há filtro de prazo disponível, o link de SLA abre a lista pelo status, com explicação de que ela inclui ocorrências dentro do prazo.

## Visualização local e limites

A marcação dos alertas exibidos fica apenas na memória do QueryClient, separada por administrador. Persiste ao navegar dentro da aplicação, mas não ao recarregar. O AuthProvider existente limpa o cache no logout ou troca de conta. Não utiliza localStorage nem endpoints de leitura. Uma alteração na contagem do SLA volta a destacar esse alerta.

Não consulta GET/PATCH `/admin/notifications` nem o recurso `/notifications` exclusivo de cidadãos. Não inventa respostas de cidadão, revisões de rejeição, bairros, datas de eventos de SLA ou histórico persistente. A lista é uma visão dos registros consultados, não um feed completo de eventos.

## Validação automatizada

`npm test -- src/features/notifications` cobre:

- Polling de 30 segundos, deduplicação e parada após desmontagem.
- Somente consultas aos endpoints existentes, sem mutações de leitura.
- Navegação para o detalhe pelo UUID completo.
- Marcação local mantida na mesma sessão.
- Offline com preservação dos dados e atualização desabilitada.
- Falha parcial, tentativa manual e estado vazio real.
- Paginação no servidor e mudança de contagem SLA.

Também executar `npm run build`, `npm run lint` e a suíte completa. Integração com backend real e revisão visual no navegador exigem sessão administrativa e dados de homologação; não foram realizadas nesta entrega.
