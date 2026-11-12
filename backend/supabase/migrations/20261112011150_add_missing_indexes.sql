-- P2-3: SLA queries filtram (status, status_updated_at)
CREATE INDEX IF NOT EXISTS occurrences_status_status_updated_idx
  ON public.occurrences (status, status_updated_at);

-- P2-4: retry-account-deactivation filtra WHERE auth_cleanup_completed_at IS NULL
CREATE INDEX IF NOT EXISTS account_deactivation_pending_idx
  ON public.account_deactivation_jobs (created_at)
  WHERE auth_cleanup_completed_at IS NULL;