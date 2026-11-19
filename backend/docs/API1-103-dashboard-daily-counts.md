# API1-103 — Série diária real do dashboard

GET `/api/v1/admin/dashboard` mantém os indicadores existentes e acrescenta:

```json
{
  "daily_counts_timezone": "America/Sao_Paulo",
  "daily_counts": [
    { "date": "2026-11-12", "count": 2 },
    { "date": "2026-11-13", "count": 0 },
    { "date": "2026-11-14", "count": 1 },
    { "date": "2026-11-15", "count": 0 },
    { "date": "2026-11-16", "count": 0 },
    { "date": "2026-11-17", "count": 0 },
    { "date": "2026-11-18", "count": 2 }
  ]
}
```

Esse fragmento pertence ao objeto `data`. As datas acima exemplificam uma consulta feita em 19/11/2026 no calendário de São Paulo.

## Calendário e contagem

São sete dias completos anteriores ao dia atual, calculado por `CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'`. Hoje é excluído para evitar comparar um dia parcial com dias completos. A meia-noite inicial local (hoje menos sete dias) é inclusiva; a meia-noite de hoje é exclusiva. Ambos os limites são convertidos para `timestamptz` antes da comparação com `created_at`, armazenado em UTC.

Não é uma janela móvel de 168 horas nem um agrupamento por data UTC. A conversão IANA respeita as regras históricas do fuso. O timezone da sessão PostgreSQL não interfere. A série é ordenada por data crescente e contém sempre sete entradas, incluindo zero para dias sem registros. Cada ocorrência é contada uma vez, independentemente de status, fotos, votos ou histórico. Os demais indicadores continuam com seu escopo original.

O campo `date` já representa um dia local: o frontend exibe seus componentes sem converter a string para um instante local. Valida sete datas consecutivas, contagens inteiras não negativas e o timezone declarado. A média exibida é a soma da série dividida por sete, inclusive dias zerados. Nenhum valor vem da listagem paginada de ocorrências.

## Implantação e autorização

A migration `20261119000000_dashboard_daily_counts.sql` substitui `get_admin_dashboard()`, preserva `SECURITY DEFINER`, `search_path` vazio e a verificação `is_admin()`. Somente ADMIN ativo, MASTER ou OPERATIONAL, tem acesso; anon não tem grant. O endpoint não muda de rota ou autorização.

Aplicar a migration primeiro no Supabase local/homologação e validar antes de promover. Não foi aplicada em banco remoto nesta tarefa. Até sua aplicação, o frontend aceita o contrato antigo e informa série indisponível; não inventa zeros. Uma série presente mas inválida é tratada como erro de contrato.

## Testes

- `supabase/tests/database/09-dashboard-daily-counts.test.sql`: pgTAP transacional com rollback, base vazia, sete datas, limites inferior/superior, microssegundos, meia-noite UTC/local, zeros, múltiplas fotos e histórico, timezone de conexão alternativo, preservação dos totais e permissões. Deve rodar apenas no Supabase descartável da suíte (`npm run test:db`), após todas as migrations.
- `tests/integration/dashboard.routes.spec.ts`: resposta REST, preservação da série RPC e bloqueios de autenticação/autorização; banco simulado.
- Frontend: validação da série, ano bissexto/virada de mês e ano, zeros reais, carregamento/erro/contrato anterior, tabela acessível, média e ligação da série ao dashboard.

### Limitações de validação nesta máquina

O Supabase local não está disponível em `127.0.0.1:54322`, portanto pgTAP não foi executado. Os marcadores de conflito que impediam o backend de compilar foram resolvidos posteriormente, alinhando o código ao consentimento por foto da migration mais recente. Build, lint, 234 testes unitários e 80 testes de integração do backend passaram; seis testes de integração dependentes de ambiente foram ignorados. A revisão visual com dados reais depende do backend e da migration funcionando.
