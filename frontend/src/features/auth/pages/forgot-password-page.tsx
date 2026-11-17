import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { useAdminPasswordRecoveryViewModel } from '../view-models/use-admin-password-recovery-view-model';

export function ForgotPasswordPage() {
  const vm = useAdminPasswordRecoveryViewModel();
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-brand-primary">Recuperar senha</h1>
      <p className="mb-6 text-sm text-ink-secondary">Informe seu e-mail institucional para receber instruções.</p>
      <form onSubmit={(event) => { event.preventDefault(); void vm.submit(); }}>
        <label className="field-label" htmlFor="recovery-email">E-mail institucional</label>
        <input id="recovery-email" type="email" autoComplete="email" className="field-input"
          value={vm.email} onChange={(event) => vm.setEmail(event.target.value)} />
        {vm.invalid && <p role="alert" className="mt-2 text-sm text-red-600">{vm.invalid}</p>}
        {vm.networkError && <p role="alert" className="mt-2 text-sm text-red-600">{vm.networkError}</p>}
        {vm.submitted && (
          <p role="status" className="mt-3 rounded-lg bg-surface-info p-3 text-sm text-brand-primary">
            Se o e-mail estiver cadastrado, você receberá instruções. Confira também sua caixa de spam.
          </p>
        )}
        <Button type="submit" className="mt-5 w-full" isLoading={vm.isSubmitting}>Enviar link de recuperação</Button>
      </form>
      <Link className="mt-5 block text-center text-sm font-semibold text-brand-primary underline" to="/login">Voltar ao login</Link>
    </div>
  );
}
