import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { AppError, safeErrorMessage } from '@/shared/errors/app-error';
import { queryKeys } from '@/shared/types/query-keys';
import { changeAdminPasswordSchema, editAdminProfileSchema } from '../schemas/admin-profile.schemas';
import { useAdminProfile } from '../hooks/use-admin-profile';
import { changeAdminPassword, updateAdminProfile } from '../services/admin-profile.service';

export function useAdminProfileViewModel() {
  const profile = useAdminProfile();
  const identity = useAdminIdentity();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [isPasswordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const savePending = useRef(false);
  const passwordPending = useRef(false);

  function openEdit() {
    if (!profile.data) return;
    setEditName(profile.data.name);
    setEditPhone(profile.data.phone ?? '');
    setProfileError('');
    setProfileSuccess('');
    setIsEditing(true);
  }

  function cancelEdit() {
    if (savePending.current) return;
    setIsEditing(false);
    setProfileError('');
  }

  async function saveProfile() {
    if (savePending.current || !profile.data) return;
    const parsed = editAdminProfileSchema.safeParse({ name: editName, phone: editPhone });
    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? 'Confira os dados do perfil.');
      return;
    }
    if (parsed.data.name === profile.data.name && parsed.data.phone === profile.data.phone) {
      setIsEditing(false);
      setProfileSuccess('Nenhuma alteração foi necessária.');
      return;
    }
    savePending.current = true;
    setIsSaving(true);
    setProfileError('');
    try {
      const saved = await updateAdminProfile(parsed.data);
      queryClient.setQueryData(queryKeys.adminProfile, saved);
      setIsEditing(false);
      setProfileSuccess('Seus dados foram atualizados com sucesso.');
    } catch (error) {
      setProfileError(safeErrorMessage(error));
    } finally {
      savePending.current = false;
      setIsSaving(false);
    }
  }

  function clearPasswords() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function openChangePassword() {
    if (passwordPending.current) return;
    clearPasswords();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOpen(true);
  }

  function cancelChangePassword() {
    if (passwordPending.current) return;
    clearPasswords();
    setPasswordError('');
    setPasswordOpen(false);
  }

  async function submitPassword() {
    if (passwordPending.current) return;
    const parsed = changeAdminPasswordSchema.safeParse({
      currentPassword, newPassword, confirmPassword,
    });
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? 'Confira as senhas informadas.');
      return;
    }
    passwordPending.current = true;
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await changeAdminPassword(parsed.data.currentPassword, parsed.data.newPassword);
      clearPasswords();
      setPasswordOpen(false);
      setPasswordSuccess('Senha alterada com sucesso. Use a nova senha no próximo acesso.');
    } catch (error) {
      if (error instanceof AppError && error.code === 'CURRENT_PASSWORD_MISMATCH') {
        setPasswordError(error.message);
      } else {
        setPasswordError(safeErrorMessage(error));
      }
      // Não retenha a senha atual depois de uma tentativa de alteração.
      setCurrentPassword('');
    } finally {
      passwordPending.current = false;
      setChangingPassword(false);
    }
  }

  return {
    profile, identity, sessionEmail: session?.user.email ?? null,
    isEditing, editName, setEditName, editPhone, setEditPhone, isSaving,
    profileError, profileSuccess, openEdit, cancelEdit, saveProfile,
    isPasswordOpen, currentPassword, setCurrentPassword, newPassword, setNewPassword,
    confirmPassword, setConfirmPassword, isChangingPassword, passwordError,
    passwordSuccess, openChangePassword, cancelChangePassword, submitPassword,
  };
}
