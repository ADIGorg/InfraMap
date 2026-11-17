# API1-95 — WEB-UI-03 Mapa Administrativo (MVVM)

Branch: `feature/web-ui-03-admin-map`; base: `feature/web-ui-02-dashboard`.
Troca arquitetural aprovada: **React Leaflet v4 + Leaflet v1.9 + OpenStreetMap** em lugar do Google Maps.
Sem merge na `main`, migrations, alterações de dados ou segredos versionados.

## Arquitetura e arquivos

- View: `src/features/admin-map/pages/admin-map-page.tsx` e `components/admin-leaflet-map.tsx`, `components/adjust-location-dialog.tsx`, `components/admin-map-filters.tsx`.
- ViewModel: `src/features/admin-map/view-models/use-admin-map-view-model.ts`, sem mudança de regras de negócio.
- Model: `src/features/admin-map/services/admin-occurrences.service.ts`.
- Helpers: `src/features/admin-map/services/map-presentation.ts` converte bounds Leaflet em bbox da API.
- CSS do Leaflet importado em `src/main.tsx`, pins estilizados em `src/styles/index.css`.
- Sem Google Maps Platform, faturamento ou credenciais da Google.
- Alternância voluntária mapa/lista e fallback automático para lista textual quando ocorre `tileerror`.
- Mapa visível mesmo com 0 ocorrências; nenhum marcador fictício ou placeholder.
- Pinos coloridos só para RECEIVED / UNDER_ANALYSIS / CONFIRMED / IN_SERVICE. Popup apresenta dados admin já autorizados, link de detalhe e ajuste.
- Modal de ajuste: arrastar marcador, clicar no mapa ou digitar latitude/longitude, confirmar em segundo passo, revalidar status antes de PATCH. O RPC backend preserva `location_original` e auditoria.

## Rodar localmente

No repositório `InfraMap`:

1. `git fetch origin`
2. `git switch feature/web-ui-03-admin-map`
3. `git pull origin feature/web-ui-03-admin-map` (somente se a árvore local estiver limpa)
4. `cd frontend`
5. `npm install` (remove biblioteca Google e instala `leaflet`, `react-leaflet` e `@types/leaflet`)
6. `npm run dev`
7. Com backend em execução, acesse `http://localhost:5173/admin/map`.

Manter `VITE_API_BASE_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `frontend/.env` existente. Não precisa adicionar nenhuma variável de mapa. Variáveis antigas `VITE_GOOGLE_MAPS_KEY` e `VITE_GOOGLE_MAP_ID` são ignoradas e podem ser retiradas do `.env` local quando desejado.

## Contrato do backend (inalterado)

- `GET /api/v1/admin/occurrences?page=1&pageSize=100&sort=recent&status=RECEIVED,UNDER_ANALYSIS,CONFIRMED,IN_SERVICE`
- Filtros realmente suportados: `categoryId` UUID e `minLat,maxLat,minLng,maxLng` todos informados e válidos.
- `GET /api/v1/categories`: categorias reais.
- `GET /api/v1/admin/occurrences/:id`: revalidação de status.
- `PATCH /api/v1/admin/occurrences/:id/location` com `{lat,lng}` somente.
- Resultados paginados até o fim, limite explícito de 100 páginas sem mostrar resultados parciais como se fossem completos.
- RESOLVED e REJECTED não são pontos ativos; consulta na lista/histórico.
- Área visível é convertida de `map.getBounds()` para `minLat/maxLat/minLng/maxLng`; bbox que cruza o antimeridiano exige tratamento pela API e é recusada sem emitir 400.
- Bairro e período continuam desabilitados até existir filtro global paginado no backend.

## Política de uso OpenStreetMap

Dados e tiles são gratuitos para uso moderado do projeto acadêmico, mas **servidores públicos são mantidos pela comunidade e não oferecem SLA ou uso ilimitado**.

- URL raster oficial: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Atribuição claramente visível: `© OpenStreetMap contributors`, link `https://www.openstreetmap.org/copyright`.
- Respeitar cache HTTP nativo do navegador; não definir no-cache nem referrer-policy que omita `Referer` nas requisições de tiles.
- Não fazer bulk-download, offline prefetch, varredura automatizada, requisição de tiles sem necessidade ou distribuição como serviço de tiles.
- Não usar geocoding reverso público automaticamente em cada movimento; bairro/período não são simulados.
- Se o tile server falhar ou limitar solicitações, manter a lista textual; nunca expor dados privados do autor em URL pública de tiles.
- Para escala comercial ou carga mais alta, substituir a fonte de tiles por provedor com termos, limites e disponibilidade adequados ou hospedar tiles próprios.

Fonte oficial: https://operations.osmfoundation.org/policies/tiles/
Documentação React Leaflet 4: https://react-leaflet.js.org/docs/v4/start-installation/

## Homologação

- [ ] Login ADMIN ativo e rota `/admin/map`; logout bloqueia acesso.
- [ ] Mapa OSM carrega sem chave, exibe créditos e funciona em desktop e viewport mobile.
- [ ] Recebido, Em análise, Confirmado, Em atendimento com cores corretas; sem pins terminais.
- [ ] Clicar pin abre resumo e link /admin/occurrences/:id; a tela de detalhe é ticket separado (API1-97).
- [ ] Aplicar e limpar filtros status/categoria; testar filtro bbox completo após mover mapa.
- [ ] API com 0 registros: mapa sem pins e aviso, sem dados simulados.
- [ ] Bloqueio do tile.openstreetmap.org na aba Network: fallback em lista.
- [ ] Botões alternar mapa/lista, incluindo ajuste de coordenadas pela lista.
- [ ] Modal de ajuste: drag, clique no mapa e números manuais (inclusive campos temporariamente vazios), confirmação explícita.
- [ ] Validar 403, 400 e 409; mutation nunca marca sucesso em falha.
- [ ] Após ajuste, validar nova posição, localização original preservada e histórico no backend.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Revisar fidelidade visual ao Figma; exports JSON originais não estão disponíveis.

Pendências: filtros globais bairro/período requerem backend; validação manual com dados de QA requer registros controlados, sem alterar Supabase real sem autorização.
