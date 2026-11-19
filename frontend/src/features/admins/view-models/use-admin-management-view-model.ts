import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminIdentity, type AdminIdentity } from '@/features/auth/services/admin-identity.service';
import { queryKeys } from '@/shared/types/query-keys';
import { AppError, safeErrorMessage } from '@/shared/errors/app-error';
import { AdministratorsService, type Administrator, type AdministratorChanges, type CreateAdministrator } from '../services/administrators.service';

const isMaster = (identity?: AdminIdentity) => identity?.role === 'ADMIN' && identity.is_active && identity.admin_level === 'MASTER';
export function useAdminManagementViewModel() {
  const client = useQueryClient();
  const [revoked, setRevoked] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selection, setSelection] = useState<{ item: Administrator; changes: AdministratorChanges; title: string } | null>(null);
  const identity = useQuery({ queryKey: queryKeys.adminMe, queryFn: getAdminIdentity,
    retry: false, staleTime: 0, refetchInterval: 30_000 });
  const permitted = !revoked && !identity.isError && isMaster(identity.data);
  const list = useQuery({ queryKey: queryKeys.administrators, queryFn: ({ signal }) => AdministratorsService.list(signal),
    enabled: permitted, retry: false, staleTime: 0 });
  const denied = list.error instanceof AppError && [401, 403].includes(list.error.statusCode);
  const allowed = permitted && !denied;
  const activeMasters = list.data?.filter(item => item.is_active && item.admin_level === 'MASTER').length ?? 0;
  const lastMaster = (item: Administrator) => item.is_active && item.admin_level === 'MASTER' && activeMasters <= 1;

  async function execute(operation: () => Promise<unknown>, kind: 'create' | 'update') {
    if (lock.current || !allowed || !list.isSuccess) return false;
    lock.current = true; setPending(true); setError(''); setMessage('');
    try {
      const current = await client.fetchQuery({ queryKey: queryKeys.adminMe, queryFn: getAdminIdentity, staleTime: 0 });
      if (!isMaster(current)) throw new AppError(403, 'FORBIDDEN', 'Acesso revogado.');
      await operation();
      setSelection(null);
      setMessage(kind === 'create' ? 'Administrador cadastrado com sucesso.' : 'Administrador atualizado com sucesso.');
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.administrators }),
        client.invalidateQueries({ queryKey: queryKeys.adminMe }),
      ]);
      return true;
    } catch (failure) {
      if (failure instanceof AppError && [401, 403].includes(failure.statusCode)) {
        setRevoked(true);
        client.removeQueries({ queryKey: queryKeys.administrators });
        void client.invalidateQueries({ queryKey: queryKeys.adminMe });
      }
      setError(failure instanceof AppError && failure.statusCode === 409
        ? kind === 'create' ? 'Já existe uma conta com esse e-mail. Confira os dados antes de tentar novamente.'
          : 'A alteração conflitou com o estado atual. O último MASTER ativo deve ser preservado. A lista foi atualizada.'
        : safeErrorMessage(failure));
      if (failure instanceof AppError && [404, 409].includes(failure.statusCode)) {
        setSelection(null);
        await client.invalidateQueries({ queryKey: queryKeys.administrators });
      }
      return false;
    } finally { lock.current = false; setPending(false); }
  }
  // Senha não entra no cache de mutations: permanece apenas no formulário/requisição.
  const create = (input: CreateAdministrator) => execute(() => AdministratorsService.create(input), 'create');
  const confirm = () => selection
    ? execute(() => AdministratorsService.update(selection.item.id, selection.changes), 'update')
    : Promise.resolve(false);
  return { identity, list, allowed, pending, message, error, selection, setSelection, lastMaster, create, confirm };
}
