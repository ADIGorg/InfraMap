import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { useResetPasswordViewModel } from '../view-models/use-reset-password-view-model';

export function ResetPasswordPage() {
  const vm = useResetPasswordViewModel();
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-brand-primary">Definir nova senha</h1>
      {vm.success ? (
        <p role="status" className="rounded-lg bg-surface-info p-4 text-sm">
          Senha atualizada. <Link className="font-semibold underline" to="/login">Voltar ao login</Link>
        </p>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void vm.submit(); }}>
          <label htmlFor="new-password" className="field-label">Nova senha</label>
          <input id="new-password" type="password" className="field-input mb-4" autoComplete="new-password"
            value={vm.password} onChange={(event) => vm.setPassword(event.target.value)} />
          <label htmlFor="confirm-password" className="field-label">Confirmar senha</label>
          <input id="confirm-password" type="password" className="field-input mb-4" autoComplete="new-password"
            value={vm.confirmation} onChange={(event) => vm.setConfirmation(event.target.value)} />
          {vm.error && <p role="alert" className="mb-4 text-sm text-red-600">{vm.error}</p>}
          <Button type="submit" isLoading={vm.isSaving} className="w-full">Salvar nova senha</Button>
        </form>
      )}
    </div>
  );
}
