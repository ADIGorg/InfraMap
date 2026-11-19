import type { RouteObject } from 'react-router-dom';
import { AdminDashboardPage } from './pages/admin-dashboard-page';

export const dashboardRoutes: RouteObject[] = [
  { path: '/admin/dashboard', element: <AdminDashboardPage /> },
];

