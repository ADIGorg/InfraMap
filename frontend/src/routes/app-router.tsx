import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { AdminLayout } from '@/layouts/admin-layout';
import { LoginPage } from '@/features/auth/pages/login-page';
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page';
import { FeaturePlaceholder } from '@/shared/components/feature-placeholder';
import { ProtectedRoute } from './protected-route';
import { MasterRoute } from './master-route';
import { AdminOccurrencesPage } from '@/features/occurrences/pages/admin-occurrences-page';
import { AdminOccurrenceDetailPage } from '@/features/occurrences/pages/admin-occurrence-detail-page';

export function AppRouter() {
  return (
    <BrowserRouter>
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3" href="#main-content">
        Ir para conteúdo principal
      </a>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<FeaturePlaceholder
              title="Visão Geral do Saneamento" ticket="API1-94"
              description="Dashboard com indicadores, alertas SLA e ocorrências recentes." />} />
            <Route path="/admin/map" element={<FeaturePlaceholder
              title="Mapa Administrativo" ticket="API1-95"
              description="Visualização de ocorrências ativas, filtros e ajuste de localização." />} />
            <Route path="/admin/occurrences" element={<AdminOccurrencesPage />} />
            <Route path="/admin/occurrences/:id" element={<AdminOccurrenceDetailPage />} />
            <Route path="/admin/notifications" element={<FeaturePlaceholder
              title="Notificações" ticket="API1-98"
              description="Alertas administrativos derivados de dados reais." />} />
            <Route path="/admin/agencies" element={<FeaturePlaceholder
              title="Gestão de Órgãos" ticket="API1-92"
              description="Consulta disponível a todos os ADMINs ativos; mutações exigirão MASTER." />} />
            <Route element={<MasterRoute />}>
              <Route path="/admin/admins" element={<FeaturePlaceholder
                title="Administradores do Sistema" ticket="API1-99"
                description="Gestão de usuários institucionais exclusiva de MASTER." />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<main id="main-content" className="page-container"><h1 className="text-2xl font-bold">Página não encontrada</h1></main>} />
      </Routes>
    </BrowserRouter>
  );
}
