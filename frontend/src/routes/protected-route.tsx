import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { ForbiddenScreen } from '@/shared/components/forbidden-screen';
import { LoadingScreen } from '@/shared/components/loading-screen';

export function ProtectedRoute() {
  const location = useLocation();
  const { session, isLoading: sessionLoading } = useAuth();
  const identityQuery = useAdminIdentity(Boolean(session));

  if (sessionLoading) return <LoadingScreen />;
  if (!session) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={'/login?returnTo=' + returnTo} replace />;
  }
  if (identityQuery.isLoading || identityQuery.isPending) return <LoadingScreen />;
  if (identityQuery.isError || identityQuery.data?.role !== 'ADMIN' || identityQuery.data.is_active !== true) {
    return <ForbiddenScreen />;
  }
  return <Outlet />;
}
