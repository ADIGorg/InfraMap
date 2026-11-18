import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { useResetPasswordViewModel } from '../view-models/use-reset-password-view-model';

export function ResetPasswordPage() {
  const vm = useResetPasswordViewModel();

  if (!vm.canReset) {
    return (
      <section aria-labelledby="reset-title">
        <h1 id="reset-title" className="mb-3 text-xl font-bold text-brand-primary">Definir nova senha</h1>
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          Sua recuperação ainda não foi confirmada. Abra o link mais recente do e-mail e clique em “Continuar recuperação”.
        </p>
        <Link className="mt-5 block text-center text-sm font-semibold text-brand-primary underline"
          to="/forgot-password">Solicitar outro link</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-title">
      <h1 id="reset-title" className="mb-4 text-xl font-bold text-brand-primary">Definir nova senha</h1>
      {vm.success ? (
        <div role="status" className="rounded-lg bg-surface-info p-4 text-sm text-brand-primary">
          <p className="font-semibold">Senha atualizada com sucesso.</p>
          <p className="mt-2">Você já pode entrar no painel com sua nova senha.</p>
          <Link className="mt-3 block font-semibold underline" to="/login">Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void vm.submit(); }}>
          <label htmlFor="new-password" className="field-label">Nova senha</label>
          <input id="new-password" type="password" className="field-input mb-4" autoComplete="new-password"
            minLength={8} maxLength={72} required
            value={vm.password} onChange={(event) => vm.setPassword(event.target.value)} />
          <label htmlFor="confirm-password" className="field-label">Confirmar senha</label>
          <input id="confirm-password" type="password" className="field-input mb-4" autoComplete="new-password"
            minLength={8} maxLength={72} required
            value={vm.confirmation} onChange={(event) => vm.setConfirmation(event.target.value)} />
          {vm.error && <p role="alert" className="mb-4 text-sm text-red-700">{vm.error}</p>}
          <Button type="submit" isLoading={vm.isSaving} className="w-full">Salvar nova senha</Button>
        </form>
      )}
    </section>
  );
}

