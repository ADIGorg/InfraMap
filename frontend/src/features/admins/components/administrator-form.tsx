import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { createAdministratorSchema, type CreateAdministrator } from '../services/administrators.service';

export function AdministratorForm({ disabled, onCreate }: {
  disabled: boolean; onCreate: (input: CreateAdministrator) => Promise<boolean>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateAdministrator>({
    resolver: zodResolver(createAdministratorSchema),
    defaultValues: { name: '', email: '', password: '', admin_level: 'OPERATIONAL' },
  });
  const submit = handleSubmit(async input => {
    try { if (await onCreate(input)) reset(); }
    finally { setValue('password', ''); setShowPassword(false); }
  });
  return <section className="rounded-2xl border border-line-subtle bg-white p-6">
    <h2 className="mb-5 text-lg font-bold">Cadastrar novo administrador</h2>
    <form onSubmit={event => void submit(event)} noValidate>
      <fieldset disabled={disabled || isSubmitting} className="space-y-4">
        <div><label className="field-label" htmlFor="admin-name">Nome completo</label>
          <input id="admin-name" className="field-input" maxLength={150} autoComplete="name" {...register('name')} aria-invalid={!!errors.name} />
          {errors.name && <p role="alert">{errors.name.message}</p>}</div>
        <div><label className="field-label" htmlFor="admin-email">E-mail institucional</label>
          <input id="admin-email" className="field-input" type="email" maxLength={254} autoComplete="off" {...register('email')} aria-invalid={!!errors.email} />
          {errors.email && <p role="alert">{errors.email.message}</p>}</div>
        <div><label className="field-label" htmlFor="admin-password">Senha inicial</label>
          <div className="relative">
            <input id="admin-password" className="field-input pr-12" type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" maxLength={72} {...register('password')} aria-invalid={!!errors.password} />
            <button type="button" aria-label={showPassword ? 'Ocultar senha inicial' : 'Mostrar senha inicial'}
              aria-pressed={showPassword} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword(value => !value)}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-ink-secondary transition hover:bg-surface-info hover:text-brand-primary disabled:opacity-60">
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p role="alert">{errors.password.message}</p>}</div>
        <div><label className="field-label" htmlFor="admin-level">Perfil de acesso</label>
          <Controller name="admin_level" control={control} render={({ field }) => <Select id="admin-level" name={field.name} ref={field.ref}
            value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} disabled={disabled || isSubmitting}
            options={[{ value: 'OPERATIONAL', label: 'Operacional' }, { value: 'MASTER', label: 'Master' }]} />} /></div>
        <Button className="w-full" type="submit">Cadastrar administrador</Button>
        <p className="text-xs text-ink-secondary">A conta é criada diretamente com a senha informada. Não há envio de convite por e-mail.</p>
      </fieldset>
    </form>
  </section>;
}
