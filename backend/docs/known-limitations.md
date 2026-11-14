# Limitações conhecidas e riscos de produção — InfraMap

**Este arquivo evita confundir "225 testes SQL aprovados" com "produto homologado em produção".** As correções de QA tratam falhas verificáveis, mas algumas decisões arquiteturais seguem pendentes. Nenhuma tarefa abaixo foi declarada implementada sem verificação específica.

## P0 / Integridade cross-service — finalização e Storage

`finalize_occurrence` confirma PostgreSQL (ocorrência, photo metadata, IA CONSUMED e histórico). Depois, a aplicação movimenta arquivos `temporary/...` para `occurrences/...` no Supabase Storage. Postgres e Storage **não compartilham transação distribuída**. Falha no segundo passo pode criar ocorrência sem fotos disponíveis, mesmo com transação SQL consistente.

**Recomendação:** desenhar saga/outbox durável com estado `FINALIZING` ou `PENDING_MEDIA`, operação idempotente e job de reconciliação; aceitar/confirmar somente após verificar presença de cada arquivo. Não alterar fluxo/estados sem revisar migrations, contratos mobile, rollback e teste real de falha. Esta branch manteve o fluxo existente e **não o homologou contra falhas de rede**.

## P1 / IA assíncrona em memória

`POST /ai-analyses/:id/analyze` retorna HTTP 202 e dispara o processamento com promise não persistida em fila. Uma interrupção do processo Node pode deixar análise `PROCESSING` sem retomada automática. Em produção, migrar para job runner/queue durável com recovery e retries controlados; adicionar integração de restart.

## P1 / Provider Gemini ainda não integrado diretamente

Na `main` desta baseline, `AI_PROVIDER` aceita `mock` e `http`; o provider HTTP é genérico e valida URL HTTPS/model/key. Não existe opção dedicada `gemini` no schema/factory atual. A escolha do fornecedor Gemini discutida no projeto requer adaptação/testes do payload, auth, limites e resposta. Não registrar como entregue apenas porque `AI_PROVIDER=http` existe.

## P1 / Coordenadas e filtros de consulta

O mapper `SupabaseOccurrenceQueryRepository.parseGeoPoint` reconhece GeoJSON e WKT, porém formatos geoespaciais retornados diretamente pelo PostgREST podem exigir EWKB ou transformação SQL explícita. O fallback atual `{lat:0,lng:0}` não representa um local válido e deveria gerar erro/transformação controlada.

Schemas de listagem aceitam `status`/bbox na query, enquanto contratos do domínio usam `statuses`/`bbox`; algumas listagens podem ignorar filtros ou ordenar sem o resultado esperado. Precisam de DTO/mappers e testes de filtro SQL, não apenas de parsing Zod. Não anunciar esses filtros como inteiramente homologados.

## P1 / Teste de câmera e frontend

O backend só recebe bytes MIME e verifica magic bytes. Não consegue provar com segurança que a foto foi capturada naquele exato momento pela câmera, em vez de vir de galeria. Essa regra exige controles no aplicativo mobile e política antifraude complementar.

## P1 / Recuperação, mensageria e auditoria

- Testes de entrega e retries de notificações push / Realtime no cliente mobile não estão presentes nesta branch.
- E-mail HTTP real e comportamento de falha de provider devem ser testados em staging sandbox, nunca enviados a órgãos reais durante QA.
- Histórico interno deve passar por revisão contínua ao adicionar novos eventos, não só `OBSERVATION_INTERNAL_ADDED`.
- Validações de concorrência (voto simultâneo, forwarding, finalização dupla, foto em trânsito) merecem testes paralelos.
- A limpeza posterior no Auth da desativação usa job; é necessário operador de retry/observabilidade.
- Revisar o OpenAPI após mudanças em schemas e endpoints; os contratos podem apresentar drift.
- Chaves expostas em screenshots devem ser rotacionadas se pertencentes ao ambiente hospedado.

## Acesso e deployment

- Ainda não foi criado deploy automático de migrations para Supabase remoto.
- QA E2E está configurado para Supabase **local somente**. Produção/staging exigem fluxo de deploy separado, análise de drift e rollout com aprovação.
- O sucesso local prova comportamento sobre a sequência de migrations da branch, **não o estado do banco hospedado**, que pode ter diferenças de grants/versions/owners.
- Não executar `supabase db reset --remote`, nem apontar testes com escrita para o projeto de produção.

## Backlog sugerido após QA-01/02/03

1. Plano de saga/recuperação de finalização (integridade Storage/Postgres).
2. Fila durável de IA e retry, provider Gemini e testes de contrato.
3. Normalização central de DTOs/filtros/geografia e comparação com contratos mobile.
4. Homologação staging com runner restrito a project-ref de QA e fixtures excluídas.
5. Testes de concorrência, de rede/falha e observabilidade/alertas.
6. Revisão de documentação OpenAPI/segurança com o frontend/mobile.

**Critério de encerramento:** cada item exige issue/ticket, testes positivos/negativos, PR revisado e validação de staging, sem confundir este backlog com correções já executadas.
