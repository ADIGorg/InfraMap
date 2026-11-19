import type { RouteObject } from 'react-router-dom';
import { AdminAdminsPage } from './pages/admin-admins-page';

export const adminRoutes: RouteObject[] = [
  { path: '/admin/admins', element: <AdminAdminsPage /> },
];

