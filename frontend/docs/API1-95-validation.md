# API1-95 — WEB-UI-03 Mapa Administrativo (MVVM)

Branch: feature/web-ui-03-admin-map; base: feature/web-ui-02-dashboard.
Sem merge na main, alterações em migrations, dados de produção ou chaves versionadas.

## Implementação
- View: src/features/admin-map/pages/admin-map-page.tsx e componentes.
- ViewModel: src/features/admin-map/view-models/use-admin-map-view-model.ts.
- Model: src/features/admin-map/services/admin-occurrences.service.ts.
- Usa @vis.gl/react-google-maps para mapa, marcadores e janela de detalhes.
- Sem chave ou erro do Google: lista textual com coordenadas e link de detalhe.

## Contrato real do backend
- GET /api/v1/admin/occurrences?page=1&pageSize=100&sort=recent&status=RECEIVED,UNDER_ANALYSIS,CONFIRMED,IN_SERVICE
- Outros parâmetros suportados: categoryId UUID, minLat/maxLat/minLng/maxLng em quarteto completo.
- GET /api/v1/categories para categorias reais; GET /api/v1/admin/occurrences/:id para revalidar status.
- PATCH /api/v1/admin/occurrences/:id/location recebe apenas {lat,lng}.
- Paginação consultada até última página. Se > 100 páginas, erro explícito: nunca contar lista parcial como completa.
- Apenas status ativos como pins. RESOLVED/REJECTED permanecem na lista/histórico (RN022/RN031).
- Ao ajustar, revalida estado não terminal antes de PATCH; confirmação explícita; sem atualização otimista.
- Original da localização e histórico preservados pelo RPC do backend (RN021); frontend não envia locationOriginal.
- Erros 400, 403, 409 e 401 possuem mensagens distintas e não são tratados como sucesso.

## Restrições dos filtros
- O backend não suporta bairro/período como filtros globais. Controles são desabilitados.
- Filtro de área usa os quatro limites retornados do Google, validando ordem e coordenadas.
- Filtros só são aplicados após clique; resultados recentes não fingem busca global.

## Habilitar Google Maps no ambiente de desenvolvimento
1. Google Cloud Console: selecione/crie projeto, habilite faturamento e orçamento com alertas.
2. Ative apenas Maps JavaScript API. Geocoding não foi usado neste ticket.
3. Crie API Key para navegador com restrição HTTP referrer: http://localhost:5173/* e domínio real aprovado.
4. Restrinja a chave à Maps JavaScript API.
5. Crie Map ID próprio para AdvancedMarker (DEMO_MAP_ID apenas para dev).
6. No frontend/.env ignorado pelo Git, defina VITE_GOOGLE_MAPS_KEY e VITE_GOOGLE_MAP_ID.
7. Reinicie npm run dev após editar .env.
8. Em frontend, execute npm install na primeira sincronização para obter a nova dependência.
9. Chaves VITE_ são públicas no bundle: nunca adicionar segredo/service role, limitar chave por domínio/API.
10. Monitorar preço e consumo; não presumir gratuidade de requests Google Maps.

## Homologação manual
- [ ] Entrar como ADMIN ativo, abrir /admin/map, validar layout responsivo.
- [ ] Pin por status ativo e nenhum RESOLVED/REJECTED.
- [ ] Testar filtro categoria, status, aplicar e limpar.
- [ ] Testar bbox minLat/maxLat/minLng/maxLng e dados fora da área.
- [ ] Sem dados: estado vazio. Sem chave/falha Google: lista textual.
- [ ] Com chave: pin, popup, detalhe, ajuste arrastando marcador.
- [ ] Alternativa manual de ajuste com latitude e longitude.
- [ ] Confirmação, PATCH, refresh, histórico e posição original imutável.
- [ ] Recusas 400/403/409; sessão 401.
- [ ] Testar com ocorrências autorizadas de QA, não alterar dados de produção sem aprovação.
- [ ] Validar CI TypeScript, lint, testes e build, revisar Figma.

Dependências: API1-50 e API1-55 entregues; filtro global bairro/período depende de novo contrato backend.
