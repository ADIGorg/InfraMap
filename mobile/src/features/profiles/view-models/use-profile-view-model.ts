
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/infrastructure/api/supabase-auth';
import { queryClient } from '@/infrastructure/query-client';
import { changePassword, } from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';

import type { AccountProfile } from '@/shared/types/api';

import { deleteMyAccount } from '../services/account.service';
import {
  getMyProfile,
  updateMyProfile,
} from '../services/profile.service';

import { changePasswordSchema } from '../schemas/change-password-schema';
import { profileSchema } from '../schemas/profile-schema';

interface FieldErrors {
  name?: string;
  phone?: string;
  general?: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function useProfileViewModel() {
  // Profile states
  const [profile, setProfile] = useState<AccountProfile | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(
    null,
  );

  // Edit profile states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editErrors, setEditErrors] = useState<FieldErrors>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  // Change password states
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordErrors, setPasswordErrors] =
    useState<PasswordErrors>({});

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  const [passwordSuccess, setPasswordSuccess] =
    useState(false);

  // Delete account states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] =
    useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(
    null,
  );

  // Logout states
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const loadedProfile = await getMyProfile();

      setProfile(loadedProfile);
    } catch (error) {
      if (error instanceof AppError) {
        setLoadError(error.message);
      } else {
        setLoadError(
          'Não foi possível carregar seu perfil.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [loadProfile]);

  // Edit profile
  const openEdit = useCallback(() => {
    if (!profile) {
      return;
    }

    setEditName(profile.name);
    setEditPhone(profile.phone ?? '');
    setEditErrors({});
    setIsEditOpen(true);
  }, [profile]);

  const closeEdit = useCallback(() => {
    if (isSaving) {
      return;
    }

    setIsEditOpen(false);
    setEditErrors({});
  }, [isSaving]);

  const clearEditError = useCallback(
    (field: keyof FieldErrors) => {
      setEditErrors((previous) => ({
        ...previous,
        [field]: undefined,
        general: undefined,
      }));
    },
    [],
  );

  const submitEdit = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const validation = profileSchema.safeParse({
      name: editName,
      phone: editPhone,
    });

    if (!validation.success) {
      const fieldErrors =
        validation.error.flatten().fieldErrors;

      setEditErrors({
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
      });

      return;
    }

    setIsSaving(true);

    try {
      const updated = await updateMyProfile({
        name: validation.data.name,
        phone:
          validation.data.phone === ''
            ? null
            : validation.data.phone,
      });

      setProfile(updated);
      setIsEditOpen(false);
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Erro ao salvar. Tente novamente.';

      setEditErrors({
        general: message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    editName,
    editPhone,
    isSaving,
  ]);

  // Change password
  const openPassword = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setPasswordSuccess(false);
    setIsPasswordOpen(true);
  }, []);

  const closePassword = useCallback(() => {
    if (isChangingPassword) {
      return;
    }

    setIsPasswordOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(false);
    setPasswordErrors({});
  }, [isChangingPassword]);

  const clearPasswordError = useCallback(
    (field: keyof PasswordErrors) => {
      setPasswordErrors((previous) => ({
        ...previous,
        [field]: undefined,
        general: undefined,
      }));
    },
    [],
  );

  const submitPassword = useCallback(async () => {
    if (isChangingPassword) {
      return;
    }

    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors =
        validation.error.flatten().fieldErrors;

      setPasswordErrors({
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });

      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      await changePassword( 
        validation.data.currentPassword, 
        validation.data.newPassword,
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === 'CURRENT_PASSWORD_MISMATCH'
      ) {
        setPasswordErrors({
          currentPassword: error.message,
        });

        return;
      }

      const message =
        error instanceof AppError
          ? error.message
          : 'Erro ao alterar senha. Tente novamente.';

      setPasswordErrors({
        general: message,
      });
    } finally {
      setIsChangingPassword(false);
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    isChangingPassword,
  ]);

  // Delete account
  const openDelete = useCallback(() => {
    setDeleteAcknowledged(false);
    setDeleteError(null);
    setIsDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setIsDeleteOpen(false);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (isDeleting || !deleteAcknowledged) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteMyAccount();

      queryClient.clear();

      await supabase.auth.signOut();
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Erro ao excluir conta. Tente novamente.';

      setDeleteError(message);
      setIsDeleting(false);
    }
  }, [
    isDeleting,
    deleteAcknowledged,
  ]);

  // Logout
  const openLogout = useCallback(() => {
    setIsLogoutOpen(true);
  }, []);

  const closeLogout = useCallback(() => {
    if (isLoggingOut) {
      return;
    }

    setIsLogoutOpen(false);
  }, [isLoggingOut]);

  const confirmLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      queryClient.clear();

      await supabase.auth.signOut();
    } catch {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  // ViewModel return
  return {
    // Profile
    profile,
    isLoading,
    loadError,
    reload: loadProfile,

    // Edit profile
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

    // Change password
    isPasswordOpen,
    currentPassword,
    setCurrentPassword,
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

    // Delete account
    isDeleteOpen,
    deleteAcknowledged,
    setDeleteAcknowledged,
    isDeleting,
    deleteError,
    openDelete,
    closeDelete,
    confirmDelete,

    // Logout
    isLogoutOpen,
    isLoggingOut,
    openLogout,
    closeLogout,
    confirmLogout,
  };
}
