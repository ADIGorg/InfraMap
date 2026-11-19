import { ArrowLeft, MailCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { useConfirmRecoveryViewModel } from '../view-models/use-confirm-recovery-view-model';

// Ao abrir, a página só exibe confirmação: nenhum OTP é gasto automaticamente.
export function ConfirmRecoveryPage() {
  const vm = useConfirmRecoveryViewModel();
  return (
    <section aria-labelledby="recovery-title">
      <h1 id="recovery-title" className="mb-3 text-xl font-bold text-brand-primary">Confirmar recuperação</h1>
      {vm.isReady ? (
        <>
          <div className="mb-5 rounded-xl bg-surface-info p-4 text-sm text-brand-primary">
            <MailCheck className="mb-3 h-7 w-7" aria-hidden="true" />
            <p>Recebemos a solicitação de recuperação da conta.</p>
            <p className="mt-2">Para sua segurança, o link só será validado quando você clicar no botão abaixo.</p>
          </div>
          <Button type="button" className="w-full" isLoading={vm.isVerifying}
            onClick={() => void vm.confirm()}>
            <ShieldCheck size={18} aria-hidden="true" />
            Continuar recuperação
          </Button>
        </>
      ) : (
        <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert className="mb-2" aria-hidden="true" />
          {vm.isExpired
            ? 'Esse link expirou ou já foi utilizado. Solicite outro link de recuperação.'
            : 'Não encontramos um link de recuperação válido. Solicite outro e-mail.'}
        </div>
      )}
      {vm.error && <p role="alert" className="mt-4 text-sm text-red-700">{vm.error}</p>}
      <Link to="/forgot-password" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-primary underline">
        <ArrowLeft size={16} aria-hidden="true" /> Solicitar outro link
      </Link>
    </section>
  );
}

