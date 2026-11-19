import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/button';
import { createAdministratorSchema, type CreateAdministrator } from '../services/administrators.service';

export function AdministratorForm({ disabled, onCreate }: {
  disabled: boolean; onCreate: (input: CreateAdministrator) => Promise<boolean>;
}) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateAdministrator>({
    resolver: zodResolver(createAdministratorSchema),
    defaultValues: { name: '', email: '', password: '', admin_level: 'OPERATIONAL' },
  });
  const submit = handleSubmit(async input => {
    try { if (await onCreate(input)) reset(); }
    finally { setValue('password', ''); }
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
          <input id="admin-password" className="field-input" type="password" autoComplete="new-password" maxLength={72} {...register('password')} aria-invalid={!!errors.password} />
          {errors.password && <p role="alert">{errors.password.message}</p>}</div>
        <div><label className="field-label" htmlFor="admin-level">Perfil de acesso</label>
          <select id="admin-level" className="field-input" {...register('admin_level')}>
            <option value="OPERATIONAL">Operacional</option><option value="MASTER">Master</option>
          </select></div>
        <Button className="w-full" type="submit">Cadastrar administrador</Button>
        <p className="text-xs text-ink-secondary">A conta é criada diretamente com a senha informada. Não há envio de convite por e-mail.</p>
      </fieldset>
    </form>
  </section>;
}
