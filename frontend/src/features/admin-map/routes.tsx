import type { RouteObject } from 'react-router-dom';
import { AdminMapPage } from './pages/admin-map-page';

export const adminMapRoutes: RouteObject[] = [
  { path: '/admin/map', element: <AdminMapPage /> },
];

