# Limitações conhecidas e riscos de produção — InfraMap

**Este arquivo evita confundir "225 testes SQL aprovados" com "produto homologado em produção".** As correções de QA tratam falhas verificáveis, mas algumas decisões arquiteturais seguem pendentes. Nenhuma tarefa abaixo foi declarada implementada sem verificação específica.

## P0 / Integridade cross-service — finalização e Storage (mitigação por retry)

`finalize_occurrence` confirma PostgreSQL (ocorrência, photo metadata, IA CONSUMED e histórico). Depois, a aplicação movimenta arquivos `temporary/...` para `occurrences/...` no Supabase Storage. Postgres e Storage **não compartilham transação distribuída**. Falha no segundo passo pode criar ocorrência sem fotos disponíveis, mesmo com transação SQL consistente.

**Mitigação implementada nesta branch:** o cliente pode repetir POST /occurrences/finalize com payload idêntico. O backend valida autor, análise, metadados e caminhos e tenta mover apenas arquivos faltantes, sem repetir a RPC de inserção. Ainda faltam testes de falha real entre DB/Storage, recuperação autônoma em caso de ausência de retry e uma estratégia de outbox/saga para maior robustez.

## P1 / IA assíncrona em memória

`POST /ai-analyses/:id/analyze` retorna HTTP 202 e dispara o processamento com promise não persistida em fila. Uma interrupção do processo Node pode deixar análise `PROCESSING` sem retomada automática. Em produção, migrar para job runner/queue durável com recovery e retries controlados; adicionar integração de restart.

## P1 / Gemini implementado; credencial e testes reais pendentes

Esta branch inclui GeminiAiProvider, `AI_PROVIDER=gemini` e modelo fixado `gemini-2.5-flash-lite` com envio inline e validação Zod. **Não há testes reais com uma chave do Google nem garantia de cota gratuita**; a equipe deve validar nível de cobrança, cotas, qualidade e privacidade no staging. O adaptador HTTP antigo permanece para compatibilidade.

## P1 / Coordenadas e filtros de consulta (mitigação nesta branch)

O mapper agora rejeita coordenadas incorretas em vez de usar `(0,0)`; a view `public_occurrences_api` converte a coordenada aproximada para lat/lng no SQL. Falta comprovar cenários reais do mapa após migração local/staging.

O schema converte status para `statuses` e parâmetros geográficos para `bbox`; a migration adiciona filtro público, próprio e administrativo do lado SQL. Ainda exigem testes E2E com múltiplas ocorrências, ordem/paginação e coordenadas nos limites, e validação em staging.

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
