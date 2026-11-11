-- Supabase Auth can write app_metadata after inserting the user, in the
-- same transaction. Provision on the first appearance of the trusted marker.
CREATE TRIGGER zz_provision_administrator_metadata
AFTER UPDATE OF raw_app_meta_data ON auth.users
FOR EACH ROW WHEN (
  NEW.raw_app_meta_data ? 'inframap_admin_provision'
  AND NOT COALESCE(OLD.raw_app_meta_data ? 'inframap_admin_provision', false)
)
EXECUTE FUNCTION public.provision_administrator();
