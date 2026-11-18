import type { RouteObject } from 'react-router-dom';
import { AdminNotificationsPage } from './pages/admin-notifications-page';

export const notificationRoutes: RouteObject[] = [
  { path: '/admin/notifications', element: <AdminNotificationsPage /> },
];

