import type { RouteObject } from 'react-router-dom';
import { AdminAgenciesPage } from './pages/admin-agencies-page';

export const agencyRoutes: RouteObject[] = [
  { path: '/admin/agencies', element: <AdminAgenciesPage /> },
];

