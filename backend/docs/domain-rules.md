# Regras de negócio — InfraMap

> Revisão: 11/11/2026. Fonte: casos de uso, controllers, schemas Zod e migrations da branch docs/architecture-openapi-domain-database-20261111.
>
> Legenda: **Implementada em código** significa que há validação ou rotina versionada; não significa que o fluxo foi homologado contra Supabase real. **Pendente/divergente** identifica incompatibilidades encontradas, sem declarar um comportamento que o projeto não garante.

## 1. Contexto e perfis

InfraMap registra, acompanha e modera problemas de infraestrutura urbana por cidadão, administrador e órgãos destinatários de encaminhamentos.

- CITIZEN: cadastra e acompanha suas ocorrências, consulta informações públicas, vota onde permitido, consulta notificações e pode desativar a própria conta.
- ADMIN: modera ocorrências, acessa consultas administrativas e painel, com conta ativa.
- ADMIN MASTER: nível com poder de provisionar/editar administradores e gerenciar órgãos; ADMIN OPERATIONAL não recebe automaticamente essas permissões.
- Papéis são lidos de user_roles e validados no backend; o aplicativo não pode atribuir a si próprio ADMIN.
- A criação pública em Supabase Auth inicializa user_roles como CITIZEN por trigger. A autenticação ocorre com JWT Supabase Auth.
- O esquema prevê profiles (cadastro) separado de user_roles (autorização).

### Registro e perfil

| Regra | Estado no código |
| --- | --- |
| Nome obrigatório na criação do usuário Auth | Trigger handle_new_user. |
| Usuário autenticado só altera nome e telefone do próprio perfil | Schema e repositório de perfil; os endpoints definitivos ainda precisam ser conectados à composição principal. |
| Administração de papel e estado ativo não pode ser delegada ao body do cidadão | RLS, middleware e funções administrativas. |
| Somente cidadão ativo pode solicitar desativação da própria conta | DeactivateMyAccountUseCase e RPC. |
| Desativação preserva ocorrências e histórico, anonimiza perfil, bloqueia papel e tenta limpar Auth | Caso de uso e account_deactivation_jobs. |
| Se revogação das sessões falhar, não prosseguir com a desativação | Caso de uso. |
| Se limpeza Auth falhar após desativação, manter pendência para retomada | Caso de uso e migration. |

**Lacuna de roteamento:** na árvore atual, GET /identity/me retorna id/email pela rota provisória; a factory de perfil completo permite GET/PATCH, porém não está montada na aplicação. PATCH /identity/me não está disponível até correção.

## 2. Categorias e classificação

- As categorias são cadastradas com código CAT01..CAT07 na migration de categorias.
- GET /categories lista apenas categorias ativas.
- Uma ocorrência finalizada deve referenciar uma categoria ativa.
- O processamento por IA pode sugerir categoria e descrição, mas o cidadão deve confirmar ou modificar antes da finalização.
- O módulo de IA aceita apenas categoryCode presente no catálogo esperado; o caso de uso traduz código para category_id ativo antes de persistir o resultado.
- Em análise automática, se confidence do provedor for **menor** que AI_CONFIDENCE_THRESHOLD (padrão 0.70), a categoria persistida é CAT07. O score é declarado pelo LLM e não deve ser apresentado como probabilidade calibrada.

### Fontes de classificação

O schema de finalização aceita AI_CONFIRMED, AI_EDITED e MANUAL para categoria e descrição. O caso de uso verifica coerência quando a fonte é AI_CONFIRMED: valores diferentes da sugestão da IA exigem AI_EDITED.

**Divergência de banco:** o ENUM original public.field_source usa USER_MANUAL, não MANUAL; uma migration posterior utiliza nomes category_source_type e description_source_type. O fluxo de fonte manual requer reconciliação antes de homologação.

## 3. Evidências e análise por IA

### Entrada de fotografias

- Apenas cidadão autenticado e ativo pode criar análise.
- Upload via multipart/form-data, campo photos.
- Obrigatório enviar de 1 a 3 arquivos.
- Limite: 5 MiB por fotografia, verificado por multer e caso de uso.
- O upload valida assinatura binária JPEG/PNG e exige MIME declarado coerente com o conteúdo.
- As fotos são armazenadas no bucket privado occurrence-photos em caminhos temporários vinculados ao usuário e à análise.
- Um erro no envio/registro provoca tentativa de remoção dos arquivos temporários; a limpeza é best effort.
- Não aceitar nomes/path de arquivos arbitrários como prova de autorização.

**Autenticidade de câmera:** exigir captura pela câmera do aplicativo e proibir galeria é uma regra de produto conhecida, mas **não há prova criptográfica dessa origem no backend**: uma API multipart isolada não comprova a fonte física da imagem. É necessária defesa adicional se essa garantia for obrigatória.

### Ciclo da análise

~~~text
UPLOADING (previsto no banco)
   -> PENDING -> PROCESSING -> COMPLETED -> CONSUMED
                     |
                     -> FAILED -> PROCESSING (nova tentativa)
CANCELLED também existe no enum, sem endpoint de cancelamento confirmado.
~~~

- GET /ai-analyses/{id} retorna somente análise pertencente ao solicitante, excluindo caminhos privados.
- POST /ai-analyses/{id}/analyze aceita PENDING ou FAILED; reserva PROCESSING antes de retornar HTTP 202.
- PROCESSING e estados finais diferentes de FAILED não podem ser iniciados novamente na implementação atual.
- Gemini recebe fotografias como bytes privados enviados pelo backend (inlineData); não receberá a chave do cliente nem paths internos como parte do contrato HTTP.
- As respostas da IA são validadas contra categoryCode, description (3–500 caracteres), confidence (0..1), modelName e promptVersion.
- A falha do provedor ou validação marca FAILED com código de erro; não expor o conteúdo bruto do fornecedor.
- **Pendente:** processamento é disparado em memória; reinício do servidor após HTTP 202 pode deixar PROCESSING sem recuperação automática.

## 4. Finalização de ocorrências

A operação POST /occurrences/finalize deve atender a todas as condições:
1. Solicitante é CITIZEN e está ativo.
2. A análise existe, pertence ao cidadão e está COMPLETED.
3. A análise ainda não foi associada/consumida por outra ocorrência (ai_analysis_id UNIQUE).
4. A categoria está ativa.
5. A descrição não é vazia e tem no máximo 500 caracteres.
6. Latitude entre -90 e 90; longitude entre -180 e 180.
7. A ocorrência possui de 1 a 3 fotografias e informação de origem de classificação/descrição.
8. AI_CONFIRMED só é válido quando o valor coincide com a sugestão existente da IA.
9. Ao finalizar, registrar ocorrência com status RECEIVED, fotos, histórico e consumo da análise de forma atômica.

**Divergência a testar:** paths temporários de imagens, tipos de fonte e location_source NOT NULL não coincidem plenamente com a migration SQL de finalização em uso. A regra acima expressa a intenção de negócio e parte das validações TypeScript/SQL, não uma garantia de execução bem-sucedida no banco atual.

## 5. Status e moderação

### Estados

| Estado | Significado |
| --- | --- |
| RECEIVED | Ocorrência registrada, aguardando triagem. |
| UNDER_ANALYSIS | Administrador iniciou análise. |
| CONFIRMED | Administrador validou o registro. |
| REJECTED | Administrador rejeitou a ocorrência com justificativa. |
| IN_SERVICE | Atendimento iniciado. |
| RESOLVED | Atendimento registrado como resolvido. |

Transições permitidas pela implementação MOD-01/MOD-02:

~~~text
RECEIVED --> UNDER_ANALYSIS --> CONFIRMED --> IN_SERVICE --> RESOLVED
                         |
                         +--> REJECTED
~~~

- Somente ADMIN ativo inicia análise, confirma, rejeita, define prioridade, inicia atendimento e resolve.
- Rejeição exige justification de 10 a 2000 caracteres no schema HTTP.
- A prioridade pode ser LOW, MEDIUM ou HIGH, somente após confirmação.
- Início do atendimento exige prioridade previamente definida e actionNotes com 10 a 2000 caracteres.
- Resolução só pode ocorrer após IN_SERVICE; resolutionNotes é opcional, até 2000 caracteres.
- As operações de status devem registrar mudança no histórico e notificar o autor conforme função SQL.
- Estado terminal REJECTED/RESOLVED não pode ser reaberto no fluxo atualmente documentado; não inventar endpoint de reabertura.
- O ENUM não contém CRITICAL. Adicioná-lo exige alteração de requisito, validação e migration nova.

### Correções administrativas

- Um ADMIN ativo pode ajustar a localização por lat/lng, preservando location_original e escrevendo location_adjusted.
- Um ADMIN pode corrigir categoryId e/ou description; ao menos um campo deve ser enviado.
- Categoria corrigida deve existir e estar ativa; descrição válida não pode estar vazia nem ultrapassar 500 caracteres.
- Mudanças são rastreadas em occurrence_history, com valores anteriores/novos quando disponíveis.
- Algumas RPCs desse fluxo foram recriadas em migrations posteriores; conferir assinatura efetivamente instalada antes de promover.

## 6. Consultas e proteção da informação

| Consulta | Visibilidade |
| --- | --- |
| /occurrences/public | Lista e detalhe sem autenticação, somente CONFIRMED e IN_SERVICE; localização reduzida. |
| /occurrences/mine | Cidadão autenticado consulta suas próprias ocorrências, inclusive outros estados. |
| /admin/occurrences | ADMIN ativo consulta informações para gestão. |
| /occurrences/{id}/history | Autor consulta sua ocorrência; ADMIN consulta qualquer ocorrência; INTERNAL restrito a ADMIN. |
| /occurrences/public/{id}/photos/{photoId} | Público apenas se ocorrência estiver CONFIRMED ou IN_SERVICE. |
| /occurrences/mine/{id}/photos/{photoId} | Autor da ocorrência. |
| /admin/occurrences/{id}/photos/{photoId} | ADMIN ativo. |

Listagens aceitam page (>=1), pageSize (1..100, padrão 20), sort (recent, oldest, most_liked), categoryId e limites opcionais de latitude/longitude; mine/admin aceitam filtro status. As rotas devolvem formatos existentes nos controllers, sem unificação automática para não quebrar clientes.

- O identificador da foto deve pertencer à ocorrência solicitada.
- A API emite URL assinada com validade curta, não torna o bucket público.
- Dados internos (storage_path, coordenada original exata e observações INTERNAL) não devem ser expostos ao público.
- A checagem de autorização deve existir mesmo quando a leitura utiliza cliente administrativo Supabase.

## 7. Histórico, observações e notificações

- O histórico registra ator, operação, data e diferenças; migration impede UPDATE/DELETE de linhas de histórico.
- ADMIN pode registrar observation com content entre 5 e 2000 caracteres.
- visibility INTERNAL é exclusivamente administrativa.
- visibility CITIZEN_RESPONSE também pode ser mostrada ao cidadão autor e dispara notificação nas rotinas previstas.
- Notificações pertencem ao destinatário e podem ser listadas, marcadas como lidas individualmente ou em lote.
- O usuário não pode modificar arbitrariamente o texto, o destinatário, a ocorrência ou o tipo da notificação; migration restringe UPDATE a read_at.
- Há configuração Supabase Realtime para notificações, mas isso **não comprova entrega push no dispositivo**. Não documentar serviço de push como concluído sem implementação.

## 8. Votos

- GET /occurrences/{id}/votes consulta contagem de votos.
- POST /occurrences/{id}/votes adiciona voto apenas para CITIZEN ativo.
- DELETE /occurrences/{id}/votes/me remove voto próprio.
- O autor da ocorrência não pode votar nela.
- Apenas ocorrências CONFIRMED e IN_SERVICE podem receber voto.
- Uma pessoa não deve votar mais de uma vez na mesma ocorrência; operações devem respeitar unicidade e comportamento transacional.
- A migration 20261110054000_enforce_transactional_voting.sql privilegia RPC register_vote e revoga inserção/exclusão direta para authenticated.
- Administrador não recebe autorização para votar apenas por ser ADMIN.

## 9. Administração, órgãos e encaminhamento

- ADMIN ativo consulta indicadores em GET /admin/dashboard.
- Somente ADMIN com admin_level MASTER ativo lista, cria e atualiza administradores.
- A atualização de um administrador não pode desativar/rebaixar o último MASTER ativo (regra implementada em função SQL).
- Provisionamento administrativo envolve Supabase Auth e regras de user_roles; não confundir com POST /identity/users provisório.
- ADMIN ativo lista órgãos.
- MASTER ativo cria e altera órgãos; desativação bloqueia novos encaminhamentos e preserva vínculos existentes.
- Banco contém forwardings com canal EMAIL, estado PENDING/SENT/FAILED e trigger que exige órgão ativo.
- O inventário da API não apresenta neste momento endpoint completo de envio de encaminhamento ou integração garantida com provedor de e-mail; não prometer entrega externa.

## 10. Segurança, erros e conformidade

- Middleware HTTP: Helmet, CORS configurável, restrição de métodos, rate limiter, JSON até 100 KB.
- Autenticação usa JWT validado com Supabase Auth e papel armazenado em user_roles.
- Casos de uso devem recusar leitura/escrita de registros de outros usuários, inclusive quando usam service_role.
- Erros da regra de negócio devem ser convertidos em HTTP 400/401/403/404/409 coerentes; **a versão atual ainda lança Error genérico em partes de occurrences/moderation, resultando potencialmente em 500**.
- Nunca registrar tokens, secrets nem conteúdo sensível das fotos em logs.
- O código limita upload por tipo/tamanho, mas não fornece scanner de malware, prova de captura na câmera ou classificação legal de dados pessoais; não assumir esses controles.

## 11. Pontos a reconciliar antes de homologação

1. Conectar o GET/PATCH definitivo de /identity/me sem manter uma rota antiga que o intercepte.
2. Harmonizar sources (MANUAL vs USER_MANUAL) e os tipos SQL da finalização.
3. Harmonizar paths temporary/ usados em upload versus validação SQL da finalização.
4. Confirmar location_source NOT NULL e parâmetros de finalização.
5. Harmonizar enum notification_type versus valores usados nas funções MOD.
6. Validar se RPCs, triggers e overloads da última migration correspondem às chamadas reais.
7. Definir a política de JPEG/PNG até a finalização.
8. Criar recuperação do estado PROCESSING no processamento de IA.
9. Validar E2E, RLS, RPCs, storage e resposta HTTP em Supabase de testes.

Esses itens não devem ser resolvidos editando migrations históricas já aplicadas. Criar alterações incrementais após executar o fluxo completo em banco de homologação.

Documentos relacionados: architecture.md, database.md e openapi.yaml.
