import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { useAdminLoginViewModel } from '../view-models/use-admin-login-view-model';

export function LoginPage() {
  const vm = useAdminLoginViewModel();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <form onSubmit={(event) => void vm.submit(event)} noValidate aria-label="Login administrativo">
        <div className="mb-5">
          <label className="field-label" htmlFor="email">E-mail institucional</label>
          <div className="relative">
            <Mail aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-ink-secondary" />
            <input id="email" type="email" autoComplete="username" className="field-input pl-10"
              placeholder="admin@instituicao.gov.br" aria-invalid={Boolean(vm.errors.email)}
              {...vm.register('email')} />
          </div>
          {vm.errors.email && <p role="alert" className="mt-1 text-sm text-red-600">{vm.errors.email.message}</p>}
        </div>
        <div className="mb-7">
          <label className="field-label" htmlFor="password">Senha de acesso</label>
          <div className="relative">
            <LockKeyhole aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-ink-secondary" />
            <input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password"
              className="field-input px-10" placeholder="Digite sua senha" aria-invalid={Boolean(vm.errors.password)}
              {...vm.register('password')} />
            <button type="button" className="absolute right-3 top-3.5 text-ink-secondary"
              aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {vm.errors.password && <p role="alert" className="mt-1 text-sm text-red-600">{vm.errors.password.message}</p>}
        </div>
        {vm.submitError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{vm.submitError}</p>}
        <Button type="submit" className="w-full" isLoading={vm.isSubmitting}>Entrar no Painel</Button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-sm font-medium text-brand-accent underline">Esqueci minha senha</Link>
      </div>
      <p className="mt-8 flex items-center gap-2 rounded-lg bg-surface-info p-3 text-xs text-brand-primary">
        <ShieldCheck aria-hidden="true" size={18} />
        Acesso institucional protegido por conexão HTTPS em produção.
      </p>
    </>
  );
}
