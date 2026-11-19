import type { RouteObject } from 'react-router-dom';
import { AdminOccurrencesPage } from './pages/admin-occurrences-page';
import { AdminOccurrenceDetailPage } from './pages/admin-occurrence-detail-page';

export const occurrenceRoutes: RouteObject[] = [
  { path: '/admin/occurrences', element: <AdminOccurrencesPage /> },
  { path: '/admin/occurrences/:id', element: <AdminOccurrenceDetailPage /> },
];

