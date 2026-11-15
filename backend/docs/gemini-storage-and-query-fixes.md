# Implementação Gemini, filtros e finalização recuperável — InfraMap

## Seleção de IA
- `AI_PROVIDER=gemini` habilita `GeminiAiProvider` usando apenas o modelo fixado `gemini-2.5-flash-lite`.
- `GEMINI_API_KEY` deve estar no servidor (não em client/mobile, Git ou logs).
- As fotos são baixadas do bucket privado pelo servidor; a API Gemini recebe bytes JPEG/PNG inline.
- Saída JSON validada por Zod: `categoryCode` (CAT01–CAT07), `description`, `confidence` (0–1).
- Continua a existir o fallback de categoria CAT07 quando `confidence < 0.7` — isto é uma estimativa do modelo, NÃO uma probabilidade calibrada.
- HTTP 429 devolve `AI_FREE_QUOTA_EXCEEDED` e NÃO troca para um modelo pago.
- A API Gemini oferece uma faixa gratuita sujeito a disponibilidade e limites por projeto; **é responsabilidade da equipe manter o projeto no plano gratuito e verificar no Google AI Studio**. Não é possível garantir custo zero pela configuração do SDK.
- Use `AI_PROVIDER=mock` para testes locais e CI, sem chave Gemini.
- `AI_PROVIDER=http` continua disponível somente como adaptador legando para evitar regressões; a opção preferencial de deploy é `gemini`.
- `POST /ai-analyses/:id/analyze` ainda usa uma Promise sem fila persistente, mantendo a arquitetura original. Reinício do servidor pode deixar `PROCESSING`; o redesign de filas NÃO está no escopo solicitado.

### Ambiente de homologação
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<configure-apenas-em-secret-store>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_CONFIDENCE_THRESHOLD=0.7
```

## Recuperação das fotos: retry idempotente
- A RPC SQL `finalize_occurrence` persiste ocorrência e metadados no banco.
- O repositório verifica ownership, análise consumida, campos imutáveis, os caminhos temporários originais e metadados de 1–3 fotos.
- Se o Storage falhar, a API retorna `OCCURRENCE_PHOTO_MOVE_FAILED`.
- **Cliente deve repetir POST /occurrences/finalize com o MESMO payload**, inclusive `aiAnalysisId`, `storagePath`, categoria, descrição e fotos.
- Em `CONSUMED`, o caso de uso NÃO chama `finalize_occurrence` de novo. Ele recupera o ID pela relação única `ai_analysis_id`, verifica o autor e os dados e completa somente os moves ausentes.
- Se o destino da foto já existe, considera-a movida; se não existe nem origem nem destino, retorna erro explícito para investigação manual. Não apaga dados.
- Recuperação depende de retry do cliente: **não é um worker autônomo** nem uma transação distribuída real. Também não repara ocorrências antigas sem o payload original.
- O teste E2E deve simular erro após commit, retry com payload idêntico e verificar apenas uma ocorrência e todos os arquivos físicos disponíveis.

## Filtros e coordenadas
- API recebe `status` único, lista de status, ou string separada por vírgulas, validada para os seis status permitidos. O DTO normaliza para `statuses`.
- Filtros espaciais exigem os quatro parâmetros `minLat/maxLat/minLng/maxLng`, transformados num `bbox` canônico.
- `public_occurrences_api` devolve apenas coordenadas **aproximadas**, pré-convertidas para `latitude`/`longitude`; filtro é aplicado SQL antes da paginação.
- `get_my_occurrences(jsonb,integer,integer)` implementa filtros de status, categoria, área e sort; `admin_list_occurrences` recebe o mesmo bbox e já aceita status/categoria.
- O mapper `parseGeoPoint` interpreta GeoJSON `Point`, WKT `POINT(...)` e objeto `{lat,lng}`. Formato desconhecido/inválido gera erro em vez de inventar `(0,0)`.
- PostgreSQL usa longitude antes de latitude, `ST_X` para `lng`, `ST_Y` para `lat`; valores SQL públicos ficam aproximados.
- Nova migration `20261115020000_add_occurrence_query_filters_and_geo_api.sql` depende da migration de segurança `20261114173000_fix_qa_rls_privacy_and_rpc_returns.sql`.
- Banco remoto não foi alterado nesta implementação; executar primeiro em Supabase local, depois staging aprovado.

## Verificações
```powershell
cd backend
npm ci
npm run build
npm run lint
npm run test:unit
npm run test:integration
# Com Docker e Supabase LOCAL:
npx supabase start
npm run test:db
npm run test:db-integration
npm run test:e2e
```

Nunca executar testes E2E que criam dados contra o Supabase Cloud atual.
