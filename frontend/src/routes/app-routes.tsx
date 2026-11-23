import { Navigate, type RouteObject } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { AdminLayout } from '@/layouts/admin-layout';
import { authRoutes } from '@/features/auth/routes';
import { dashboardRoutes } from '@/features/dashboard/routes';
import { adminMapRoutes } from '@/features/admin-map/routes';
import { occurrenceRoutes } from '@/features/occurrences/routes';
import { notificationRoutes } from '@/features/notifications/routes';
import { agencyRoutes } from '@/features/agencies/routes';
import { adminRoutes } from '@/features/admins/routes';
import { profileRoutes } from '@/features/profile/routes';
import { NotFoundPage } from '@/shared/pages/not-found-page';
import { ProtectedRoute } from './protected-route';
import { MasterRoute } from './master-route';

export const appRoutes: RouteObject[] = [
  { element: <AuthLayout />, children: authRoutes },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AdminLayout />,
      children: [
        { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
        ...dashboardRoutes,
        ...adminMapRoutes,
        ...occurrenceRoutes,
        ...notificationRoutes,
        ...agencyRoutes,
        ...profileRoutes,
        { element: <MasterRoute />, children: adminRoutes },
      ],
    }],
  },
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '*', element: <NotFoundPage /> },
];
