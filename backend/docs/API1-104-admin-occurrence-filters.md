# API1-104 — Filtros administrativos globais

## Contrato HTTP

GET `/api/v1/admin/occurrences` exige ADMIN ativo, MASTER ou OPERATIONAL. As queries públicas e do cidadão mantêm seus contratos anteriores. Filtros adicionais:

| Parâmetro | Contrato |
| --- | --- |
| `priority` | Uma opção: LOW, MEDIUM, HIGH ou UNDEFINED (prioridade NULL). |
| `q` | Texto literal, trim, 1–200 caracteres. Descrição, nome da categoria ou UUID completo/parcial. Aceita `#OC-` e `#` no identificador. Ignora caixa; preserva acentos. `%` e `_` são caracteres literais. Não busca cidadão, endereço ou bairro por texto. |
| `createdFrom` | Timestamp ISO 8601 com Z ou offset, início inclusivo sobre `created_at`. |
| `createdBefore` | Timestamp ISO 8601 com Z ou offset, fim exclusivo. Quando ambos existem, início deve ser anterior ao fim. |
| `neighborhoodId` | UUID do catálogo de bairros ativos. Filtra pelo polígono sobre a localização ajustada, se presente, ou original. Inclui pontos na borda com ST_Covers. UUID inexistente/inativo retorna zero resultados. |

Mantidos `status` (CSV ou array), `categoryId` UUID, `sort=recent|oldest|most_liked`, `page`, `pageSize` e bbox com os quatro valores `minLat`, `maxLat`, `minLng`, `maxLng`. Todos os critérios são combinados com AND; bbox não cruza o antimeridiano, exige valores válidos e mínimos <= máximos. A página HTTP é limitada a 2147483647 (integer PostgreSQL), tamanho 1–100. O offset da RPC usa bigint para evitar overflow em páginas extremas. Ordenação continua com desempate por UUID.

A RPC `admin_list_occurrences` aplica a mesma função de critérios adicionais na contagem e na seleção paginada. Mantém os campos e filtros internos legados, incluindo prioridade array para consumidores antigos da RPC; a prioridade HTTP nova usa a chave interna `priority_filter`. Nunca filtra apenas a página retornada. `filters_version: 1` é metadado interno da RPC: se houver filtro novo e o banco ainda não tiver a migration, a API retorna 503 em vez de fornecer resultados sem filtro.

## Bairro: fonte geográfica e implantação

As ocorrências não possuem bairro/endereço persistido. O contrato utiliza a nova tabela `administrative_neighborhoods`, com UUID, nome, município, polígono MultiPolygon EPSG:4326, fonte dos limites e situação ativa. Não deriva bairro da descrição, não faz geocoding em massa e não usa retângulo como se fosse um limite oficial de bairro.

GET `/api/v1/admin/occurrences/neighborhoods` devolve `{ data: [{ id, name, municipality }] }`, somente bairros ativos, ordenados por município e nome. O endpoint passa pelos mesmos middlewares de identidade e papel da lista; a tabela tem RLS administrativa e leitura autenticada. Escrita não é exposta pelo frontend: a importação é operação administrativa controlada do banco. O helper de filtros não tem EXECUTE público; somente a RPC protegida o usa.

Aplicar `supabase/migrations/20261119010000_admin_occurrence_filters.sql` em ambiente local/homologação antes de publicar o backend/frontend. A migration é transacional e não altera registros de ocorrências. O catálogo começa vazio, sem bairros fictícios ou geometrias aproximadas. Para habilitar a seleção real, importar os limites do município atendido a partir de fonte validada pela equipe:

1. Obter a malha oficial em GeoJSON, reprojetada para EPSG:4326 quando necessário.
2. Conferir nome, município, origem dos dados e validade das geometrias.
3. Importar cada geometria de bairro como `ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...),4326))`, usando os parâmetros reais de nome/município/fonte. Em conexão SQL, qualificar essas funções com `extensions`.
4. Validar registros conhecidos no interior, exterior e fronteira antes de ativá-los; conferir a fonte quando houver sobreposição de bairros.

Não foram importados limites de municípios nem aplicada migration remota nesta implementação. A seleção permanece indisponível com explicação se o catálogo estiver vazio; os demais filtros funcionam após a migration. Se a consulta ao catálogo falhar, a tela oferece tentativa novamente, sem apagar bairro já presente na URL.

## Frontend MVVM

Lista: schema de filtros valida os parâmetros, serialização mantém todos na URL, alteração reinicia a página em 1. Mapa: restaura critérios da URL e mantém histórico de navegação, combina região aplicada com campos adicionais, e envia os mesmos critérios em todas as páginas coletadas. Não filtra o resultado de 100 itens como se fosse o conjunto completo. Permanece restrito a status ativos.

O formulário usa datas/horas no fuso do navegador, identificado ao usuário, e envia instantes ISO UTC à API. Início/fim são explícitos e exclusivos conforme os rótulos. Busca e filtros adicionais são enviados após clique, sem consulta por tecla. “Limpar filtros/seleção” remove os critérios. Os controles de busca/período/prioridade/bairro são reutilizados entre lista e mapa.

## Validação

- HTTP: normalização e transporte para a RPC, consulta e proteção do catálogo, 400 para prioridades/textos/datas/bbox/páginas inválidos, 403 para cidadão e ADMIN inativo, 503 antes da migration.
- Frontend: busca e período pelo formulário, parâmetros na URL, serialização da lista, filtros em todas as páginas do mapa, navegação de retorno e bloqueio de URL inválida.
- SQL: `supabase/tests/database/10-admin-occurrence-filters.test.sql`, com rollback e fixtures sintéticas exclusivamente de QA. Exercita prioridade, NULL, total antes da paginação, região ajustada/fronteira, intervalo UTC/local, busca literal, página extrema e autorização.

Build/lint de frontend e backend e testes isolados foram executados. O teste SQL não pôde rodar: Supabase local indisponível em 127.0.0.1:54322. Executar `npm run test:db` em stack descartável após todas as migrations. Não executar fixtures de escrita em banco compartilhado. A validação visual com dados reais e limites oficiais permanece para homologação.
