# API1-102 — Consentimento explícito para divulgação de fotografias

Branch: `feature/be-ctx-03-photo-public-consent`, baseada na `main`. Sem merge, sem alterações no projeto Supabase remoto.

## Contrato

`POST /api/v1/occurrences/finalize` recebe `photoPublicConsent?: boolean`. TRUE somente se o cidadão optar por tornar fotos públicas antes da captura no aplicativo. FALSE ou omissão = privado. String `"true"`, números e null são rejeitados ou normalizados como privado conforme contrato validado (Zod rejeita tipos não booleanos; null é rejeitado pela API).

- A escolha vale para as 1–3 fotos anexadas à ocorrência (não por foto individual).
- Público pode visualizar apenas fotos com consentimento TRUE e ocorrência CONFIRMED/IN_SERVICE + public_visible TRUE.
- A ocorrência pode continuar visível no mapa mesmo sem fotos públicas (RN022).
- Fotos privadas: apenas autor e ADMIN ativo. Nenhuma resposta pública expõe storagePath, timestamp de consentimento ou valores internos da decisão.
- O bucket Supabase continua privado; entrega por URL assinada de 5 min após autorização da API.
- A autorização de URL individual e a listagem de URLs no detalhe público fazem checagens distintas para defesa em profundidade.
- No mobile a seleção pública/privada é obrigatória antes de capturar. O código envia booleano na etapa final. A versão do texto público é RN017-2026-11-15.

## Migração

`backend/supabase/migrations/20261118000000_photo_public_consent.sql`:

1. Adiciona colunas de consentimento à `public.occurrences`, com DEFAULT FALSE e CHECK da coerência da evidência.
2. Substitui `public.finalize_occurrence` com assinatura estendida, sem criar overload concorrente; o consentimento é escrito no mesmo commit de fotos e histórico.
3. Atualiza `public.is_occurrence_visible` para impedir que terceiros autenticados consultem metadados de fotos privadas por RLS.

Migrações históricas não são modificadas. O timestamp e a versão ficam NULL quando não há consentimento público. Fotos antigas não ganham publicidade por inferência.

## QA

- [ ] Backend: `npm run build && npm run lint && npm run test:unit && npm run test:integration`.
- [ ] Mobile: `npm test -- --runInBand` e `npx tsc --noEmit`.
- [ ] Supabase **local descartável**: pgTAP, Auth, Storage e E2E com consentimento TRUE/FALSE, anônimo, autor, terceiro e ADMIN.
- [ ] Em homologação: confirmar carga com registros antigos, manipulação de foto UUID, URL expirada e concorrência de recuperação de fotos (retry consent inalterado).
- [ ] Revisar o texto de consentimento com orientação jurídica/encarregado LGPD antes do deploy.
- [ ] Não aplicar migration na base real sem autorização e janela de integração.
