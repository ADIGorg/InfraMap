import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { AppError } from '@/shared/errors/app-error';
import {
  createAgency, listAgencies, updateAgency, type Agency, type AgencyWriteInput,
} from '../services/agencies.service';

const agenciesKey = ['admin', 'agencies'] as const;

export function useAgenciesManagementViewModel() {
  const client = useQueryClient();
  const identity = useAdminIdentity();
  // Nunca inferir nível MASTER do JWT/localStorage ou do êxito de uma leitura.
  const canManage = identity.data?.admin_level === 'MASTER';

  const agencies = useQuery({
    queryKey: agenciesKey,
    queryFn: ({ signal }) => listAgencies(signal),
    retry: false,
    staleTime: 30_000,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [deactivating, setDeactivating] = useState<Agency | null>(null);
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const requireMaster = () => {
    if (!canManage) {
      throw new AppError(403, 'MASTER_REQUIRED', 'A gestão de órgãos exige administrador MASTER.');
    }
  };

  const create = useMutation({
    mutationFn: async (input: AgencyWriteInput) => {
      requireMaster();
      return createAgency(input);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: agenciesKey });
      setIsCreating(false);
      setNotice('Órgão cadastrado com sucesso.');
    },
  });
  const edit = useMutation({
    mutationFn: async ({ id, changes }: {
      id: string;
      changes: Partial<AgencyWriteInput> & { is_active?: boolean };
    }) => {
      requireMaster();
      return updateAgency(id, changes);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: agenciesKey });
      setEditing(null);
      setDeactivating(null);
      setNotice('Órgão atualizado com sucesso.');
    },
  });

  const filtered = (agencies.data ?? []).filter((agency) => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return (!onlyActive || agency.is_active)
      && (!q || agency.name.toLocaleLowerCase('pt-BR').includes(q)
        || agency.email.toLocaleLowerCase('pt-BR').includes(q));
  });

  const openCreate = () => {
    if (!canManage) return;
    setNotice(null);
    create.reset();
    setIsCreating(true);
    setEditing(null);
  };
  const openEdit = (item: Agency) => {
    if (!canManage) return;
    setNotice(null);
    edit.reset();
    setEditing(item);
    setIsCreating(false);
  };
  const startDeactivate = (item: Agency) => {
    if (!canManage || !item.is_active) return;
    setNotice(null);
    edit.reset();
    setDeactivating(item);
  };

  return {
    identity, canManage, agencies, filtered, search, setSearch, onlyActive, setOnlyActive,
    notice, isCreating, editing, deactivating,
    openCreate, openEdit, startDeactivate,
    closeForm: () => {
      if (create.isPending || edit.isPending) return;
      setIsCreating(false);
      setEditing(null);
    },
    closeDeactivation: () => {
      if (edit.isPending) return;
      setDeactivating(null);
    },
    create, edit,
    activate: (item: Agency) => edit.mutate({ id: item.id, changes: { is_active: true } }),
    deactivate: () => {
      if (deactivating) edit.mutate({
        id: deactivating.id,
        changes: { is_active: false },
      });
    },
    refresh: () => void agencies.refetch(),
  };
}