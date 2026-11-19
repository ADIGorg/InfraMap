import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  destructive?: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open, title, description, destructive, isPending, onCancel, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next && !isPending) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="mb-2 text-xl font-bold">{title}</Dialog.Title>
          <Dialog.Description className="mb-6 text-sm text-ink-secondary">{description}</Dialog.Description>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
            <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isPending}>
              Confirmar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
