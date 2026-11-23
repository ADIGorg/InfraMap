import type { RouteObject } from 'react-router-dom';
import { AdminProfilePage } from './pages/admin-profile-page';

export const profileRoutes: RouteObject[] = [
  { path: '/admin/profile', element: <AdminProfilePage /> },
];
