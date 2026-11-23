import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, CircleUserRound, LockKeyhole, Mail, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { Card } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { PasswordVisibilityField } from '../components/password-visibility-field';
import { useAdminProfileViewModel } from '../view-models/use-admin-profile-view-model';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : (parts[0][0] ?? '') + (parts.at(-1)?.[0] ?? ''))
    .toUpperCase();
}

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informada' :
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}

export function AdminProfilePage() {
  const vm = useAdminProfileViewModel();
  const profile = vm.profile.data;
  const email = profile?.email ?? vm.sessionEmail ?? 'Não informado';
  const level = vm.identity.data?.admin_level === 'MASTER' ? 'Master' :
    vm.identity.data?.admin_level === 'OPERATIONAL' ? 'Operacional' : 'nível não informado';

  return (
    <div className="page-container max-w-[1180px] space-y-4 py-5 md:py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-primary">Meu perfil</h1>
          <p className="mt-1 text-sm text-ink-secondary">Informações da conta e configurações de segurança.</p>
        </div>
        <Link to="/admin/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-primary transition hover:bg-surface-info">
          <ArrowLeft size={17} aria-hidden="true" /> Voltar ao painel
        </Link>
      </header>

      {vm.profile.isPending && <Card role="status">Carregando os dados da conta…</Card>}
      {vm.profile.isError && (
        <Card role="alert" className="space-y-3 border border-red-200 bg-red-50">
          <p className="text-sm text-red-800">Não foi possível carregar o perfil: {safeErrorMessage(vm.profile.error)}</p>
          <Button variant="outline" onClick={() => void vm.profile.refetch()}>Tentar novamente</Button>
        </Card>
      )}

      {profile && (
        <>
          <Card className="overflow-hidden border border-line-subtle p-0">
            <div className="flex flex-col gap-4 bg-brand-primary px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between md:px-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/40 bg-brand-secondary text-lg font-extrabold text-brand-dark shadow-sm" aria-hidden="true">
                  {initials(profile.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Conta conectada</p>
                  <h2 className="mt-0.5 break-words text-lg font-bold leading-tight sm:text-xl">{profile.name}</h2>
                  <p className="mt-1 break-all text-xs text-white/80 sm:text-sm">{email}</p>
                </div>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-2 text-xs font-semibold text-white">
                <ShieldCheck size={16} aria-hidden="true" /> Administrador {level}
              </span>
            </div>
          </Card>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card className="min-w-0 border border-line-subtle p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold">
                    <UserRound size={20} className="text-brand-primary" aria-hidden="true" />
                    Informações da conta
                  </h2>
                  <p className="mt-1 text-xs text-ink-secondary">Dados pessoais vinculados à sua conta.</p>
                </div>
                {!vm.isEditing && (
                  <Button variant="outline" onClick={vm.openEdit} className="min-h-9 px-3 py-2">
                    <Pencil size={16} aria-hidden="true" /> Editar dados
                  </Button>
                )}
              </div>
              {vm.profileSuccess && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg bg-surface-info p-3 text-sm text-brand-primary">
                <CheckCircle2 size={17} aria-hidden="true" /> {vm.profileSuccess}
              </p>}

              {vm.isEditing ? (
                <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void vm.saveProfile(); }}>
                  <label className="field-label" htmlFor="profile-name">Nome completo</label>
                  <input id="profile-name" className="field-input" type="text" required minLength={3} maxLength={150}
                    autoComplete="name" value={vm.editName} disabled={vm.isSaving}
                    onChange={(event) => vm.setEditName(event.target.value)} />
                  <label className="field-label" htmlFor="profile-phone">Telefone (opcional)</label>
                  <input id="profile-phone" className="field-input" type="tel" maxLength={20} autoComplete="tel"
                    placeholder="Ex.: (75) 99999-9999" value={vm.editPhone} disabled={vm.isSaving}
                    onChange={(event) => vm.setEditPhone(event.target.value)} />
                  <p className="text-xs text-ink-secondary">Deixe o telefone vazio para removê-lo. O e-mail e o nível administrativo são somente leitura.</p>
                  {vm.profileError && <p role="alert" className="text-sm text-red-700">{vm.profileError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" isLoading={vm.isSaving}>Salvar alterações</Button>
                    <Button type="button" variant="outline" disabled={vm.isSaving} onClick={vm.cancelEdit}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <dl className="grid gap-x-5 sm:grid-cols-2">
                  <div className="min-w-0 border-t border-line-subtle py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <UserRound size={15} aria-hidden="true" /> Nome completo
                    </dt>
                    <dd className="mt-1 break-words font-semibold">{profile.name}</dd>
                  </div>
                  <div className="min-w-0 border-t border-line-subtle py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <Mail size={15} aria-hidden="true" /> E-mail de acesso
                    </dt>
                    <dd className="mt-1 break-all font-semibold">{email}</dd>
                  </div>
                  <div className="min-w-0 border-t border-line-subtle py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Telefone</dt>
                    <dd className="mt-1 font-semibold">{profile.phone ?? 'Não informado'}</dd>
                  </div>
                  <div className="min-w-0 border-t border-line-subtle py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <CalendarDays size={15} aria-hidden="true" /> Conta criada em
                    </dt>
                    <dd className="mt-1 font-semibold">{formattedDate(profile.created_at)}</dd>
                  </div>
                </dl>
              )}
            </Card>

            <Card className="min-w-0 border border-line-subtle p-5 md:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <LockKeyhole size={20} className="text-brand-primary" aria-hidden="true" /> Segurança
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Proteja o acesso à sua conta administrativa.
                </p>
              </div>
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface-info px-3 py-2.5">
                <CircleUserRound className="shrink-0 text-brand-primary" size={20} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-brand-primary">Sessão autenticada</p>
                  <p className="mt-1 break-all text-xs text-ink-secondary">
                    Conectado como {email}
                  </p>
                </div>
              </div>
              {vm.passwordSuccess && <p role="status" className="flex items-center gap-2 text-sm text-brand-primary">
                <CheckCircle2 size={17} aria-hidden="true" /> {vm.passwordSuccess}
              </p>}
              {!vm.isPasswordOpen ? (
                <Button type="button" variant="outline" onClick={vm.openChangePassword} className="w-full">
                  <LockKeyhole size={17} aria-hidden="true" /> Alterar minha senha
                </Button>
              ) : (
                <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void vm.submitPassword(); }}>
                  <PasswordVisibilityField
                    id="current-password" label="Senha atual" visibilityLabel="senha atual"
                    value={vm.currentPassword} onChange={vm.setCurrentPassword}
                    autoComplete="current-password" disabled={vm.isChangingPassword}
                  />
                  <PasswordVisibilityField
                    id="new-password" label="Nova senha" visibilityLabel="nova senha"
                    value={vm.newPassword} onChange={vm.setNewPassword}
                    autoComplete="new-password" minLength={8} maxLength={72} disabled={vm.isChangingPassword}
                  />
                  <PasswordVisibilityField
                    id="confirm-password" label="Confirmar nova senha" visibilityLabel="confirmação da nova senha"
                    value={vm.confirmPassword} onChange={vm.setConfirmPassword}
                    autoComplete="new-password" minLength={8} maxLength={72} disabled={vm.isChangingPassword}
                  />
                  <p className="text-xs text-ink-secondary">Use de 8 a 72 caracteres e escolha uma senha diferente da atual.</p>
                  {vm.passwordError && <p role="alert" className="text-sm text-red-700">{vm.passwordError}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="submit" isLoading={vm.isChangingPassword}>Confirmar nova senha</Button>
                    <Button type="button" variant="outline" disabled={vm.isChangingPassword}
                      onClick={vm.cancelChangePassword}>Cancelar</Button>
                  </div>
                </form>
              )}
              <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-ink-secondary">
                Esqueceu a senha atual? Use a recuperação disponível na tela de login.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
