import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { queryClient } from '@/infrastructure/query-client';
import { signOutAdmin, signInAdmin } from '../services/auth.service';
import { getAdminIdentity } from '../services/admin-identity.service';
import { safeAdminReturnTo } from '../services/safe-return-to';
import { loginSchema, type LoginFields } from '../schemas/login.schema';

export function useAdminLoginViewModel() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async ({ email, password }) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setSubmitError(null);
    try {
      await signInAdmin(email, password);
      const identity = await getAdminIdentity();
      if (identity.role !== 'ADMIN' || identity.is_active !== true) {
        throw new Error('Not authorized');
      }
      form.reset({ email: '', password: '' });
      queryClient.clear();
      const returnTo = safeAdminReturnTo(new URLSearchParams(location.search).get('returnTo'));
      navigate(returnTo ?? '/admin/dashboard', { replace: true });
    } catch {
      await signOutAdmin().catch(() => undefined);
      setSubmitError('E-mail ou senha inválidos, ou acesso administrativo não autorizado.');
    } finally {
      pendingRef.current = false;
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
