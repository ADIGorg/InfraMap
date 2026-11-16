import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from './card';

export function ForbiddenScreen({ master = false }: { master?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <Card className="max-w-md text-center">
        <ShieldAlert aria-hidden="true" className="mx-auto mb-3 h-11 w-11 text-brand-primary" />
        <h1 className="mb-2 text-xl font-bold">Acesso não autorizado</h1>
        <p className="mb-5 text-sm text-ink-secondary">
          {master
            ? 'Este recurso exige nível MASTER confirmado pela API. Sem essa confirmação, o acesso permanece bloqueado.'
            : 'Sua conta não tem autorização administrativa ativa.'}
        </p>
        <Link to={master ? '/admin/dashboard' : '/login'} className="font-semibold text-brand-primary underline">
          {master ? 'Voltar ao painel' : 'Voltar ao login'}
        </Link>
      </Card>
    </div>
  );
}
