import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { queryClient } from '@/infrastructure/query-client';
import { signOutAdmin, signInAdmin } from '../services/auth.service';
import { getAdminIdentity } from '../services/admin-identity.service';
import { loginSchema, type LoginFields } from '../schemas/login.schema';

export function useAdminLoginViewModel() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    try {
      await signInAdmin(email.trim(), password);
      const identity = await getAdminIdentity();
      if (identity.role !== 'ADMIN' || identity.is_active !== true) {
        throw new Error('Not authorized');
      }
      queryClient.clear();
      navigate('/admin/dashboard', { replace: true });
    } catch {
      await signOutAdmin().catch(() => undefined);
      setSubmitError('E-mail ou senha inválidos, ou acesso administrativo não autorizado.');
    }
  });

  return {
    register: form.register,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    submit,
    submitError,
  };
}
