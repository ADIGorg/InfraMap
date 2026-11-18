import { BrowserRouter, useRoutes } from 'react-router-dom';
import { appRoutes } from './app-routes';

function AppRoutes() {
  return useRoutes(appRoutes);
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3" href="#main-content">
        Ir para conteúdo principal
      </a>
      <AppRoutes />
    </BrowserRouter>
  );
}
