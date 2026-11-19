# API1-94 — Dashboard Administrativo (WEB-UI-02)

Branch: feature/web-ui-02-dashboard
Base: feature/web-ui-01-login-admin (API1-93, ainda não integrada)
Sem merge ou alterações na main; backend, schema e Supabase não modificados.

## Arquitetura MVVM

- View: src/features/dashboard/pages/admin-dashboard-page.tsx
- ViewModel: src/features/dashboard/view-models/use-admin-dashboard-view-model.ts
- Model: src/features/dashboard/services/dashboard.service.ts
- Formatação: src/features/dashboard/utils/dashboard-format.ts

A rota /admin/dashboard deixou de ser um placeholder e agora consome apenas dados reais dos endpoints existentes:

- GET /api/v1/admin/dashboard — resposta { data: { counts_by_status, high_priority_total, average_resolution_days, sla_breaches } }
- GET /api/v1/admin/occurrences?page=1&pageSize=5&sort=recent — { data: [], pagination: {} }

Os DTOs são validados com Zod na borda HTTP.
A View não faz fetch nem calcula estatísticas globais.
O QueryClient executa polling de 30 segundos quando os componentes estão ativos; sem WebSocket ou alegação de atualização em tempo real.
O 401/403 continua sob responsabilidade do cliente HTTP e do backend.

## Limites reais e lacunas do backend

A API1-103 continua aberta; GET /admin/dashboard **não** retorna daily_counts.
O gráfico de 7 dias deve exibir "Dados diários indisponíveis nesta versão da API" até que a série real seja entregue, homologada e com fuso definido.
Não derivar contagem global a partir de cinco itens; não gerar barras fictícias.

O backend não oferece o filtro de prioridade HIGH na listagem. O card "Prioridade alta" usa high_priority_total global do dashboard; a lista de alta prioridade exibe APENAS itens HIGH entre os 5 recentes, com indicação explícita desse limite.
A API não retorna bairro na lista atual, então a tabela não exibe bairro fictício.
Prioridade CRITICAL não existe: enum é LOW, MEDIUM, HIGH.

Média de resolução null = "Sem resoluções"; zero legítimo permanece "0 dias".
Os SLAs são métricas de horas e dias corridos conforme migration de backend (48 horas e 5 dias); não interpretar como dias úteis.
Falhas na API exibem erro; jamais converter em zeros por fallback.
Os seis status sempre aparecem se houver contrato válido, mesmo quando todos são zero.

## Homologação funcional

1. Garantir frontend/.env público correto, backend em http://localhost:3000 e usuário ADMIN ativo.
2. Na raiz do repositório, mudar para feature/web-ui-02-dashboard e atualizar via Git.
3. No frontend: npm run dev.
4. Entrar no painel, visitar /admin/dashboard.
5. Verificar seis cards de status, HIGH, média (ou Sem resoluções), os dois SLAs.
6. Verificar lista das 5 recentes e links para /admin/occurrences (página do colega pode ainda ser placeholder).
7. Verificar indicador "Atualização automática a cada 30 s", atualização manual e estados de erro/rede.
8. Confirmar ausência de gráfico inventado (API1-103).
9. Executar npm run typecheck, npm run lint, npm test, npm run build.
10. Validar visual comparando com screenshot do Figma (não afirmar pixel-perfect).
11. Não testar com alteração de dados de produção sem plano de testes e aprovação.

## Dependências

- API1-58 (GET dashboard): Feito no Jira.
- API1-103 (daily_counts): A fazer. Somente este recurso adicional está explicitamente indisponível.
- API1-96 (lista completa): em implementação por outro integrante; o link "Ver todas" existe, mas a página ainda pode ser placeholder.

Não integrar a main nem encerrar este ticket antes dos testes manuais.
