import type { RouteObject } from 'react-router-dom';
import { LoginPage } from './pages/login-page';
import { ForgotPasswordPage } from './pages/forgot-password-page';
import { ConfirmRecoveryPage } from './pages/confirm-recovery-page';
import { ResetPasswordPage } from './pages/reset-password-page';

export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/confirm-recovery', element: <ConfirmRecoveryPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
];

