import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { safeErrorMessage } from '@/shared/errors/app-error';
import {
  agencyFormSchema, agencyInputFromForm,
  type Agency, type AgencyFormValues, type AgencyWriteInput,
} from '../services/agencies.service';

const newValues: AgencyFormValues = {
  name: '', email: '', phone: '', description: '',
};

interface AgencyFormDialogProps {
  item: Agency | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (input: AgencyWriteInput) => Promise<unknown>;
}

export function AgencyFormDialog({
  item, isOpen, isPending, onClose, onSave,
}: AgencyFormDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, reset, handleSubmit, formState: { errors } } = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: newValues,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(item ? {
      name: item.name,
      email: item.email,
      phone: item.phone ?? '',
      description: item.description ?? '',
    } : newValues);
    setSubmitError(null);
  }, [isOpen, item, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSave(agencyInputFromForm(values));
    } catch (error) {
      setSubmitError(safeErrorMessage(error));
    }
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-bold text-ink-primary">
              {item ? 'Editar órgão responsável' : 'Cadastrar órgão responsável'}
            </Dialog.Title>
            <Dialog.Close asChild disabled={isPending}>
              <button type="button" className="rounded p-2 hover:bg-slate-100" aria-label="Fechar formulário">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-5 mt-2 text-sm text-ink-secondary">
            O cadastro será utilizado no encaminhamento de ocorrências.
            Alterações de e-mail não reescrevem registros históricos.
          </Dialog.Description>
          <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
            <div>
              <label className="field-label" htmlFor="agency-name">Nome do órgão *</label>
              <input id="agency-name" className="field-input" maxLength={150}
                aria-invalid={Boolean(errors.name)} {...register('name')} />
              {errors.name && <p role="alert" className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="agency-email">E-mail institucional *</label>
              <input id="agency-email" type="email" className="field-input" maxLength={150}
                aria-invalid={Boolean(errors.email)} {...register('email')} />
              {errors.email && <p role="alert" className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="agency-phone">Telefone</label>
              <input id="agency-phone" type="tel" className="field-input" maxLength={20}
                {...register('phone')} />
              {errors.phone && <p role="alert" className="mt-1 text-xs text-red-700">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="agency-description">Descrição</label>
              <textarea id="agency-description" className="field-input min-h-28" rows={3}
                {...register('description')} />
            </div>
            {submitError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {submitError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>Cancelar</Button>
              <Button type="submit" isLoading={isPending}>Salvar órgão</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}