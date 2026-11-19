import { Outlet } from 'react-router-dom';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { ForbiddenScreen } from '@/shared/components/forbidden-screen';
import { LoadingScreen } from '@/shared/components/loading-screen';

export function MasterRoute() {
  const { data, isPending, isError } = useAdminIdentity();
  if (isPending) return <LoadingScreen />;
  // Nunca inferir privilégios do JWT ou de uma listagem admin.
  if (isError || data?.role !== 'ADMIN' || !data.is_active || data.admin_level !== 'MASTER') return <ForbiddenScreen master />;
  return <Outlet />;
}
