# Modelo de dados, RPCs e segurança — InfraMap

Fontes: migrations versionadas em `backend/supabase/migrations`, contratos `domain/repositories` e testes `supabase/tests/database`. O estado efetivo do banco hospedado **não foi auditado nem modificado**; este documento descreve o banco reconstruído pelas migrations do repositório.

## Entidades e relacionamento

| Tabela | Função e principais relações |
|---|---|
| `profiles` | Perfil público/privado do usuário Auth (`auth.users`) |
| `user_roles` | Papel CITIZEN/ADMIN, nível MASTER/OPERATIONAL e `is_active` |
| `categories` | Categorias CAT01..CAT07 e status ativo |
| `ai_analyses` | Proprietário, paths temporários, status, sugestões, consumo único |
| `occurrences` | Autor, categoria, IA consumida, status, prioridade, `public_visible`, localização original/ajustada |
| `occurrence_photos` | 1–3 referências de foto e posição, MIME, tamanho e caminho Storage privado |
| `occurrence_history` | Auditoria append-only: actor/action/previous/new/details/timestamp |
| `observations` | ADMIN: INTERNAL ou CITIZEN_RESPONSE |
| `votes` | Voto por cidadão/ocorrência (unicidade) |
| `notifications` | Mensagem privada destinada ao usuário, leitura |
| `agencies` | Órgãos e status ativo |
| `forwardings` | Ocorrência → órgão/admin; destinatário snapshot; PENDING/SENT/FAILED |
| `account_deactivation_jobs` | Controle assíncrono da limpeza Supabase Auth após anonimização SQL |

Enums relevantes: `app_role`, `admin_level`, `occurrence_status`, `occurrence_priority`, `field_source`, `location_source`, `observation_visibility`, `notification_type`, `forwarding_status`, `forwarding_channel`.

PostGIS/Geography armazena coordenadas WGS-84 (SRID 4326). Longitudes e latitudes devem ser fornecidas na ordem `lon, lat` ao construir `ST_MakePoint`.

## Cadeia de migrations

A pasta `migrations/` é a fonte versionada da estrutura. `_abandoned_09_11/` é apenas histórico e NÃO participa do replay da CLI. Execução cronológica aplica primeiro tabelas/constraints, depois RLS, funções/vistas, módulos e correções. **Nunca modificar nem renomear migration já aplicada em ambiente remoto.**

Migration corretiva desta branch:

`20261114173000_fix_qa_rls_privacy_and_rpc_returns.sql`

Ela:
- Restaura `GRANT SELECT` para `authenticated`, revogado em `20261107153937_fix_vulenarability_anon_authenticated.sql`.
- **Restringe RLS de `occurrences`** ao próprio autor ou administrador ativo, evitando que o novo GRANT exponha localização original/dados de terceiros. O público acessa a VIEW segura, nunca SELECT direto.
- Corrige `update_occurrence_priority` e `set_occurrence_public_visibility` para retornar um registro PL/pgSQL válido.
- Faz `is_occurrence_visible` respeitar `public_visible` para não autores e não admins.
- Remove eventos `OBSERVATION_INTERNAL_ADDED` do histórico consultável pelo autor, inclusive via RPC SECURITY DEFINER.
- Revoga `EXECUTE` para `anon` e `PUBLIC` nas funções `create_forwarding` e `record_forwarding_result`, mantendo a execução para `authenticated` com checagem ADMIN/ownership dentro das RPCs.

## Matriz de acesso que deve continuar verdadeira

| Operação | Público anon | CITIZEN dono | CITIZEN terceiro | ADMIN ativo |
|---|---|---|---|---|
| SELECT direto `occurrences` | Negado | Suas linhas | Negado | Todas |
| Consulta via `public_occurrences` | CONFIRMED/IN_SERVICE visível | Idem | Idem | Idem |
| Foto privada `occurrence_photos` | Negado | Suas | Somente públicas visíveis | Todas |
| Signed URL de evidência | Somente pública visível | Suas | Somente pública visível | Todas |
| Observação INTERNAL / audit event interno | Negado | Negado | Negado | Permitido |
| Voto em ocorrência própria | Negado | Negado | — | Não é papel de voto |
| RPC de encaminhamento | Negado | Negado | Negado | Permitido com estado/órgão válidos |
| Notificação individual | Negado | Apenas próprias | Negado | Sem acesso indiscriminado |

### Por que GRANT e RLS são diferentes?

`GRANT SELECT` permite a operação no nível da tabela; RLS filtra as linhas. Mesmo com RLS, um GRANT excessivo pode revelar colunas sensíveis das linhas públicas. Por isso, a policy permite SELECT direto apenas ao dono/admin e a visualização de outros cidadãos ocorre via view `public_occurrences` que expõe **só campos aprovados**.

A rota pública de fotos usa o backend com cliente privilegiado **somente após** confirmar a elegibilidade via view/status/flag, para gerar URLs com validade curta. O caminho do Storage não vai no JSON público.

### RPCs essenciais

| RPC | Regras |
|---|---|
| `finalize_occurrence` | CONSUMED só uma vez; cria ocorrência/fotos/histórico na mesma transação SQL |
| `transition_occurrence` | Estado anterior/próximo, ADMIN ativo, notificação + auditoria |
| `update_occurrence_priority` | Prioridade, elegibilidade, histórico + retorno composto |
| `set_occurrence_public_visibility` | ADMIN altera flag em CONFIRMED/IN_SERVICE |
| `register_vote` | ADD/REMOVE, owner, duplicidade, elegibilidade e contagem |
| `adjust_occurrence_location` | Ajusta sem alterar location_original |
| `create_observation` | INTERNAL ou resposta ao cidadão, histórico + notificação |
| `create_forwarding`, `record_forwarding_result` | Encaminhamento e confirmação de resultado/erro, trilha auditável |
| `get_my_occurrences`, `get_occurrence_detail`, `admin_list_occurrences`, `get_occurrence_history` | Projeções autorizadas, data e paginação |
| `deactivate_my_account` | Anonimiza perfil, desativa papel e agenda limpeza Auth |
| `get_admin_dashboard` | Resumos agregados e SLA sem expor dados a cidadãos |

**SECURITY DEFINER**: funções deste tipo ignoram RLS do chamador quando criadas por owner privilegiado, portanto devem validar `auth.uid()`, perfil ativo, proprietário, estado e inputs. O `search_path` deve ser fixado (no projeto: `''`) com nomes qualificados para evitar SQL injection por schema.

### Evidências QA (nov 2026)

`npm run test:db` executa 225 asserts pgTAP em 7 suítes, incluindo 104+ verificações estruturais, uma assertiva de GRANT para `occurrences`, estados/IA, votos, notificações, forwarded, IAM e privacidade. O workflow usa PostgreSQL local isolado (sem conexão de produção).

Se alterar o modelo, estender os testes SQL *antes* de aprovar a migration. Manualmente validar ainda SQL grant/owner, perfis, fotos e saída de dados sensíveis.

## Auditoria/rollback

- Não apagar dados reais nem executar `supabase db reset --remote` contra projeto hospedado.
- Rollback de migrations aplicadas deve ser planejado como **nova migration** compatível, com backup e avaliação de impacto.
- Para segurança, documentar impacto do GRANT, owner SECURITY DEFINER e comportamento por role. Não assumir que o banco remoto e o local têm grants idênticos sem verificar.
- Não executar diretamente no prod SQL sugerido por mensagens de erro sem inspecionar RLS.


## API1-100 — Contrato de identidade e privilégios administrativos

`GET /api/v1/admin/me` recebe JWT validado, busca `user_roles` usando o cliente Supabase do usuário autenticado e retorna `{ id, role: 'ADMIN', is_active: true, admin_level: 'MASTER' | 'OPERATIONAL' }`. A RLS `user_roles_select_own` isola a linha consultada; `GRANT SELECT` já existe na migration inicial.

`GET /api/v1/app/me` mantém `{ id, role: 'CITIZEN', is_active: true }` sem expor `admin_level`. Um ADMIN sem nível válido não recebe resposta 200. Usuários sem sessão, de outro papel ou inativos são bloqueados.

**Não foi necessária nova migration.** O tipo `public.admin_level`, a coluna `public.user_roles.admin_level`, a constraint `user_roles_role_level_check` e a RLS já existem em `20261101202618_create_profiles_and_user_roles.sql`. A autorização de escrita continua obrigatoriamente no backend (`requireMaster`) e nas RPC/RLS; o campo retornado ao cliente serve somente para a interface esconder ou apresentar opções.

A branch API1-100 ainda requer teste de integração **em Supabase local ou homologação**, com MASTER, OPERATIONAL, CITIZEN e ADMIN inativo. Não executar SQL de teste na base compartilhada/produção.
