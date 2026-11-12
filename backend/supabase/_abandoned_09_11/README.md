# Migrations abandonadas — 09/11/2026

Nunca aplicadas no remoto (confirmado via `pg_proc` em 11/11/2026).
Motivo: escritas contra schema divergente (B1-B6 na auditoria).

Substituídas por:
- 20261111120000_add_create_observation.sql
- 20261111120100_add_notify_citizen_response_trigger.sql
- 20261111120200_add_update_occurrence_priority.sql
- 20261111120300_add_deactivate_my_account.sql

Referência histórica apenas. NÃO REAPLICAR.
