# Modelo de dados e persistência — InfraMap

> Revisão: 11/11/2026. Base: backend/supabase/migrations/, código de infrastructure/repositories e clientes Supabase da branch docs/architecture-openapi-domain-database-20261111.
>
> Este documento descreve o esquema declarado pelo histórico versionado. **Não é introspecção de um banco remoto aplicado**: verificar as migrations executadas e o esquema efetivo antes de utilizar estas tabelas em produção. Divergências SQL conhecidas estão registradas na seção 9.

## 1. Tecnologia e organização

- PostgreSQL no Supabase; Supabase Auth gerencia auth.users.
- Extensão PostGIS em schema extensions, usada para coordenadas tipo geography(POINT,4326).
- Supabase Storage mantém fotografias no bucket privado occurrence-photos.
- Row Level Security (RLS), GRANT/REVOKE, views, RPCs e triggers aplicam parte das regras de segurança e integridade.
- Pasta supabase/migrations contém **38 migrations** nesta revisão; aplicar sempre na sequência do timestamp e nunca reescrever uma migration já executada.
- Os nomes de objetos abaixo seguem a estrutura SQL, não correspondem necessariamente a nomes de classes TypeScript.

## 2. Entidades principais e relações

| Tabela / objeto | Finalidade e principais chaves |
| --- | --- |
| auth.users | Identidade autenticada gerida pelo Supabase Auth (não criada por SQL do backend). |
| public.profiles | Dados cadastrais: id (PK/FK auth.users), name, phone, created_at, updated_at. |
| public.user_roles | Papel e permissão: user_id (PK/FK auth.users), role, admin_level, is_active, created_by, created_at. |
| public.categories | Catálogo com id, code único, name, description, is_active. |
| public.ai_analyses | Rascunho/análise: id, user_id (FK profiles), suggested_category_id (FK categories), input_photo_paths JSONB, status, confidence, model_name, prompt_version, error_code, timestamps. |
| public.occurrences | Registro central: id, author_id (FK profiles), category_id (FK categories), ai_analysis_id (UNIQUE/FK), description, status, priority, fontes, localização e timestamps. |
| public.occurrence_photos | Fotografias vinculadas: id, occurrence_id (FK occurrences, CASCADE), storage_path, mime_type, tamanho e posição. |
| public.occurrence_history | Auditoria: occurrence_id, actor_id, actor_type, action, previous_data, new_data, details e created_at. |
| public.observations | Observações administrativas: occurrence_id, admin_id, content, visibility e created_at. |
| public.votes | Votos: occurrence_id, user_id e created_at; verificar restrições de unicidade no SQL antes de alterações. |
| public.notifications | Notificações: user_id, occurrence_id nullable, title, message, type, read_at, created_at. |
| public.agencies | Órgãos destinatários: name, email, phone, description, is_active e datas. |
| public.forwardings | Encaminhamento: occurrence_id, agency_id, admin_id, recipient_email, subject, observations, channel, status e campos de entrega. |
| public.account_deactivation_jobs | Controle de limpeza: user_id (PK/FK auth.users), created_at, auth_cleanup_completed_at. |

### Relações estruturais

~~~text
auth.users 1 ── 1 profiles
    └───── 1 user_roles

profiles 1 ── N ai_analyses
profiles 1 ── N occurrences (author_id)
categories 1 ── N ai_analyses (suggested_category_id, opcional)
categories 1 ── N occurrences
ai_analyses 1 ── 0..1 occurrences (ai_analysis_id UNIQUE)

occurrences 1 ── N occurrence_photos
occurrences 1 ── N occurrence_history
occurrences 1 ── N observations
occurrences 1 ── N votes
occurrences 1 ── N notifications
occurrences 1 ── N forwardings
agencies 1 ── N forwardings
profiles 1 ── N forwardings (admin_id)
~~~

Os relacionamentos descrevem as chaves das migrations, não garantem que cada funcionalidade já esteja exposta na API. Forwardings, por exemplo, possui esquema e guardas de agência ativa, mas não é apresentado aqui como um fluxo completo de envio de e-mails.

## 3. ENUMs do banco

### Identidade (migration 20261101202618)

| Tipo | Valores |
| --- | --- |
| app_role | CITIZEN, ADMIN |
| admin_level | MASTER, OPERATIONAL |

CHECK em user_roles: CITIZEN exige admin_level NULL; ADMIN exige admin_level não nulo. O gatilho handle_new_user cria profiles e user_roles com papel inicial CITIZEN, independentemente de um role enviado pelo cliente.

### Domínio (migration 20261106231820)

| Tipo | Valores definidos na migration base |
| --- | --- |
| occurrence_status | RECEIVED, UNDER_ANALYSIS, CONFIRMED, IN_SERVICE, RESOLVED, REJECTED |
| occurrence_priority | LOW, MEDIUM, HIGH |
| field_source | AI_CONFIRMED, AI_EDITED, USER_MANUAL, ADMIN_CORRECTED |
| ai_analysis_status | UPLOADING, PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, CONSUMED |
| observation_visibility | INTERNAL, CITIZEN_RESPONSE |
| location_source | GPS, MANUAL |
| history_actor_type | USER, SYSTEM |
| notification_type | OCCURRENCE_STATUS_CHANGED, CITIZEN_RESPONSE |
| forwarding_channel | EMAIL |
| forwarding_status | PENDING, SENT, FAILED |

**Atenção:** migrations posteriores fazem referência a MANUAL como fonte ou a nomes de tipos como category_source_type / description_source_type, enquanto a definição original utiliza field_source e USER_MANUAL. Há também funções usando STATUS_CHANGE para notificações. Isso constitui **divergência verificável de código SQL**, não mudança já homologada no esquema. Ver seção 9.

## 4. Geolocalização e privacidade

A tabela occurrences guarda:
- location_original: geography(POINT,4326), NOT NULL, imutável.
- location_adjusted: geography(POINT,4326), nullable, correção do administrador.
- location_source: GPS/MANUAL e location_accuracy_m, além de dados de atualização.

Migrations criam trigger prevent_location_original_change e posteriormente o tornam ALWAYS. Há índices GiST nas colunas de localização e índices B-tree para autor, status, categoria e prioridade. As consultas públicas devem expor coordenadas reduzidas, nunca o ponto exato original, e restringir os status visíveis a CONFIRMED e IN_SERVICE.

A view public_occurrences e a função public_occurrences_source foram criadas/ajustadas em migrations distintas; é necessário usar a versão final aplicada. A API também consulta funções list_occurrences e get_occurrence, introduzidas em migration posterior. Não substituir essas consultas por SELECT direto em occurrences sem revisar os privilégios e o contrato de privacidade.

## 5. Invariantes de integridade

- occurrences.ai_analysis_id UNIQUE impede vincular uma análise a duas ocorrências.
- description tem limite de 500 caracteres por VARCHAR e CHECK.
- priority exige estado compatível (CONFIRMED/IN_SERVICE/RESOLVED) quando não nula.
- location_original não deve ser modificada; ajustes usam location_adjusted.
- Fotos fazem referência à ocorrência; storage_path é dado privado.
- occurrence_history possui triggers que restringem UPDATE e DELETE para preservar a trilha de auditoria.
- A finalização deve ser atômica: ocorrência, fotos, consumo da análise e histórico na mesma transação.
- O voto deve ser único por cidadão e ocorrência, e as regras de voto verificadas pela função register_vote.
- Ações administrativas que alteram status registram histórico e, quando previstas, notificação.

A existência de uma restrição SQL não garante que todas as RPCs atuais consigam executá-la: observar seção 9 e domain-rules.md.

## 6. Modelo de autorização e RLS

| Recurso | Leitura / escrita esperadas nas políticas versionadas |
| --- | --- |
| profiles | authenticated pode consultar o próprio perfil e atualizar apenas name e phone. |
| user_roles | authenticated pode consultar o próprio papel/estado; gestão de papéis é administrativa. |
| categories | anon/authenticated podem consultar categorias ativas; administradores têm visibilidade ampliada. |
| ai_analyses | authenticated vê suas análises ou, quando ADMIN, pode consultar sob política da migration. Escrita de processamento é privilegiada. |
| occurrences | acesso público limitado às confirmadas/em atendimento; autor/admin têm regras próprias para leituras. |
| occurrence_photos | leitura com checagem is_occurrence_visible; arquivos físicos permanecem em bucket privado. |
| occurrence_history | autor da ocorrência ou ADMIN; logs não são leitura pública. |
| observations | ADMIN vê internas e respostas; cidadão autor vê apenas CITIZEN_RESPONSE. |
| votes | regras iniciais permitem inserir/remover voto próprio, mas migration 20261110054000 revoga INSERT/DELETE direto e prioriza RPC transacional. |
| notifications | usuário destinatário lê e só pode atualizar coluna read_at; histórico de notificações não é público. |
| agencies | leitura administrativa; inserção/atualização MASTER, segundo migration posterior. |
| forwardings | leitura/inserção administrativa com verificação de órgão ativo; não confundir com serviço externo de e-mail entregue. |
| account_deactivation_jobs | tabela reservada ao serviço confiável, sem acesso direto de anon/authenticated. |

**Importante:** grants e RLS são mecanismos diferentes; ambos precisam autorizar a operação. Serviço que usa cliente Supabase privilegiado pode ignorar RLS: repositório deve validar proprietário/papel antes de devolver dados. SECURITY DEFINER exige revisão do search_path, EXECUTE e acesso a objetos internos.

### Storage

- Bucket: occurrence-photos, public=false.
- A política versionada não concede acesso genérico anon/authenticated em storage.objects.
- Upload e download são executados pelo backend com autorização contextual.
- Consultas autorizadas de fotos emitem URLs assinadas com expiração curta (constante PHOTO_URL_EXPIRATION_SECONDS = 300).
- Não expor storage_path nem URLs assinadas em registros permanentes ou logs.

## 7. Views, RPCs e funções importantes

| Função / objeto | Finalidade |
| --- | --- |
| handle_new_user | Cria perfil e papel inicial após cadastro em Auth. |
| set_updated_at | Atualiza timestamps via trigger. |
| is_admin, is_admin_master, is_occurrence_visible | Helpers de autorização/visibilidade. |
| public_occurrences, public_occurrences_source | Projeção pública protegida de ocorrências. |
| count_votes, register_vote | Contagem e operação de voto; register_vote foi redefinida por migration posterior. |
| get_my_occurrences, get_occurrence_detail, get_occurrence_history, admin_list_occurrences | RPCs de consulta criadas em 20261107155735. |
| list_occurrences, get_occurrence | RPCs adicionais de leitura chamadas pelo repositório de consultas. |
| finalize_occurrence | Cria ocorrência e fotos, consome análise e registra histórico; há diferentes versões em migrations. |
| transition_occurrence, transition_occurrence_status | Transições de status; interfaces diferentes coexistem no histórico. |
| set_occurrence_priority, start_occurrence_service, resolve_occurrence | Prioridade e atendimento administrativo. |
| adjust_occurrence_location, correct_occurrence_classification | Ajuste geográfico e categorização. |
| create_occurrence_observation | Observação e trilha de auditoria. |
| deactivate_my_account | Desativação/anonimização transacional. |
| get_admin_dashboard, list_administrators, update_administrator | Indicadores e gestão administrativa. |
| provision_administrator, require_active_forwarding_agency | Triggers de provisionamento e integridade do encaminhamento. |
| notify_citizen_response | Notifica cidadão quando observação de resposta é registrada. |

Para funções de mesmo nome declaradas repetidamente, considerar o SQL da **última migration aplicada à assinatura específica**. Em PostgreSQL, diferenças nas listas de parâmetros podem criar overloads, não substituir a implementação anterior.

## 8. Histórico das migrations (grupos)

- 20261101202618: contas, perfis e papéis.
- 2026110623*: habilitação PostGIS, ENUMs e categorias.
- 2026110700*: análises, ocorrências e imutabilidade da localização.
- 2026110713*: fotos, Storage, histórico, observações, votos, notificações.
- 2026110714–1557*: constraints, índices, RLS, views, funções de consulta e proteção pública.
- 20261109070000: desativação e anonimização de conta.
- 20261109100000–150000: moderação e finalização/consultas de ocorrências.
- 20261109235900: resposta ao cidadão.
- 20261110040000–054000: dashboard, administradores, órgãos e voto transacional.

A migration 20261107002116_noop.sql existe no histórico e não deve ser apagada retroativamente se já foi aplicada. Arquivos .temp do Supabase CLI são dados locais e não substituem o histórico SQL.

## 9. Incompatibilidades identificadas — validação obrigatória

1. **ENUM de fonte:** public.field_source define USER_MANUAL, mas occurrence.schema.ts e 20261109140000_occ01_finalize_occurrence.sql aceitam MANUAL e referem-se a category_source_type / description_source_type. A função de finalização mais recente tenta converter para tipos cujos nomes não correspondem à migration base. Verificar schema efetivo, assinatura da função e adaptar com migration incremental.
2. **Formato/path de fotos:** o upload cria caminhos temporary/{userId}/{analysisId}/photo-N.jpg|png; a RPC da migration de finalização 20261109140000 espera prefixo {userId}/{analysisId}/ e não o prefixo temporary/. Há divergência adicional entre upload JPEG/PNG e schema de finalização JPG/JPEG. Não afirmar que a finalização opera corretamente sem teste real.
3. **Parâmetros/colunas da finalização:** a tabela base de occurrences tem location_source NOT NULL, mas a função da migration de finalização analisada não o informa na inserção. Verificar defaults/migrations posteriores para confirmar se há correção.
4. **Notificações:** enum notification_type usa OCCURRENCE_STATUS_CHANGED/CITIZEN_RESPONSE. Algumas funções de moderação inserem STATUS_CHANGE, que pode falhar caso não exista alteração posterior do tipo.
5. **Assinaturas de funções:** há definições com prefixos e tipos diferentes entre DB-10 e MOD/OCC. Comparar as assinaturas efetivas no banco e chamadas dos repositórios, incluindo SECURITY DEFINER.
6. **Retorno de erros:** alguns repositórios convertem mensagens prefixadas de PostgreSQL em Error genérico; a camada HTTP poderá responder 500 onde o comportamento de domínio prevê 400/403/404/409.

7. **Exposição de metadados de fotos:** get_occurrence (migration 20261109150000) agrega storagePath em photos; o repositório getPublic entrega raw.photos no detalhe público. Corrigir a projeção de saída e documentar um identificador de foto seguro, sem depender de storagePath, além de testar não exposição.

**Tratamento recomendado:** criar testes de integração em banco Supabase local isolado, confirmar o estado final por pg_catalog e elaborar migration nova e reversível. Não corrigir editando migrations históricas já aplicadas. Nenhuma dessas observações autoriza aplicar mudanças diretamente em produção.

## 10. Operação, backup e evolução

O arquivo src/config/constants.ts registra metas de resposta p95 (2 s), disponibilidade (99%), backup (24 h) e RTO (4 h), mas declara expressamente que esses valores são referências **não aplicadas automaticamente**. Sua observância depende de infraestrutura, monitoramento, políticas de backup e testes de restauração.

Para evoluir o schema:
1. Documentar a regra em domain-rules.md.
2. Criar migration cronológica incremental.
3. Aplicar localmente em banco descartável e testar RLS, RPCs e rollback quando aplicável.
4. Atualizar repositórios e casos de uso, OpenAPI e testes.
5. Submeter revisão antes de promover para ambientes compartilhados.

Documentos relacionados: architecture.md e domain-rules.md.
