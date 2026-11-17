import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/api/supabase-auth';
import { queryClient } from '@/infrastructure/query-client';
import { getMyProfile, updateMyProfile } from '../services/profile.service';
import { deleteMyAccount } from '../services/account.service';
import { updatePassword } from '@/features/auth/services/auth.service';
import { profileSchema } from '../schemas/profile-schema';
import { changePasswordSchema } from '../schemas/change-password-schema';
import { AppError } from '@/shared/errors/app-error';
import type { AccountProfile } from '@/shared/types/api';

interface FieldErrors {
  name?: string;
  phone?: string;
  general?: string;
}

interface PasswordErrors {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function useProfileViewModel() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editErrors, setEditErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (err) {
      if (err instanceof AppError) setLoadError(err.message);
      else setLoadError('Não foi possível carregar seu perfil.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ─── Edit ───
  const openEdit = useCallback(() => {
    if (!profile) return;
    setEditName(profile.name);
    setEditPhone(profile.phone ?? '');
    setEditErrors({});
    setIsEditOpen(true);
  }, [profile]);

  const closeEdit = useCallback(() => {
    if (isSaving) return;
    setIsEditOpen(false);
    setEditErrors({});
  }, [isSaving]);

  const clearEditError = useCallback((field: keyof FieldErrors) => {
    setEditErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (isSaving) return;
    const validation = profileSchema.safeParse({ name: editName, phone: editPhone });
    if (!validation.success) {
      const fe = validation.error.flatten().fieldErrors;
      setEditErrors({ name: fe.name?.[0], phone: fe.phone?.[0] });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateMyProfile({
        name: validation.data.name,
        phone: validation.data.phone === '' ? null : validation.data.phone,
      });
      setProfile(updated);
      setIsEditOpen(false);
    } catch (err) {
      const msg =
        err instanceof AppError ? err.message : 'Erro ao salvar. Tente novamente.';
      setEditErrors({ general: msg });
    } finally {
      setIsSaving(false);
    }
  }, [editName, editPhone, isSaving]);

  // ─── Password ───
  const openPassword = useCallback(() => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setPasswordSuccess(false);
    setIsPasswordOpen(true);
  }, []);

  const closePassword = useCallback(() => {
    if (isChangingPassword) return;
    setIsPasswordOpen(false);
    setPasswordSuccess(false);
    setPasswordErrors({});
  }, [isChangingPassword]);

  const clearPasswordError = useCallback((field: keyof PasswordErrors) => {
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }, []);

  const submitPassword = useCallback(async () => {
    if (isChangingPassword) return;
    const validation = changePasswordSchema.safeParse({
      newPassword,
      confirmPassword,
    });
    if (!validation.success) {
      const fe = validation.error.flatten().fieldErrors;
      setPasswordErrors({
        newPassword: fe.newPassword?.[0],
        confirmPassword: fe.confirmPassword?.[0],
      });
      return;
    }
    setIsChangingPassword(true);
    try {
      await updatePassword(validation.data.newPassword);
      setPasswordSuccess(true);
    } catch (err) {
      const msg =
        err instanceof AppError
          ? err.message
          : 'Erro ao alterar senha. Tente novamente.';
      setPasswordErrors({ general: msg });
    } finally {
      setIsChangingPassword(false);
    }
  }, [newPassword, confirmPassword, isChangingPassword]);

  // ─── Delete ───
  const openDelete = useCallback(() => {
    setDeleteAcknowledged(false);
    setDeleteError(null);
    setIsDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (isDeleting || !deleteAcknowledged) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount();
      queryClient.clear();
      await supabase.auth.signOut();
    } catch (err) {
      const msg =
        err instanceof AppError
          ? err.message
          : 'Erro ao excluir conta. Tente novamente.';
      setDeleteError(msg);
      setIsDeleting(false);
    }
  }, [isDeleting, deleteAcknowledged]);

  // ─── Logout ───
  const openLogout = useCallback(() => setIsLogoutOpen(true), []);
  const closeLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLogoutOpen(false);
  }, [isLoggingOut]);

  const confirmLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      queryClient.clear();
      await supabase.auth.signOut();
    } catch {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  return {
    profile,
    isLoading,
    loadError,
    reload: loadProfile,
    isEditOpen,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    editErrors,
    isSaving,
    openEdit,
    closeEdit,
    submitEdit,
    clearEditError,
    isPasswordOpen,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordErrors,
    isChangingPassword,
    passwordSuccess,
    openPassword,
    closePassword,
    submitPassword,
    clearPasswordError,
    isDeleteOpen,
    deleteAcknowledged,
    setDeleteAcknowledged,
    isDeleting,
    deleteError,
    openDelete,
    closeDelete,
    confirmDelete,
    isLogoutOpen,
    isLoggingOut,
    openLogout,
    closeLogout,
    confirmLogout,
  };
}