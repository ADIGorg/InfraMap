import type { RouteObject } from 'react-router-dom';
import { AgenciesPage } from './pages/agencies-page';

export const agencyRoutes: RouteObject[] = [
  { path: '/admin/agencies', element: <AgenciesPage /> },
];

