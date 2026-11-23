import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, CircleUserRound, LockKeyhole, Mail, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { Card } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { safeErrorMessage } from '@/shared/errors/app-error';
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
    vm.identity.data?.admin_level === 'OPERATIONAL' ? 'Operacional' : 'Administrador';

  return (
    <div className="page-container max-w-[1120px] space-y-6">
      <header>
        <Link to="/admin/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          ← Voltar ao painel
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-primary">Meu perfil</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Consulte a conta conectada, atualize seus dados e gerencie sua senha de acesso.
        </p>
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
            <div className="h-16 bg-brand-primary" aria-hidden="true" />
            <div className="-mt-8 flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
              <div className="flex min-w-0 items-end gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-secondary text-2xl font-extrabold text-brand-dark shadow-card" aria-hidden="true">
                  {initials(profile.name)}
                </div>
                <div className="min-w-0 pb-1">
                  <h2 className="break-words text-xl font-bold text-ink-primary">{profile.name}</h2>
                  <p className="break-all text-sm text-ink-secondary">{email}</p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-info px-4 py-2 text-xs font-bold text-brand-primary">
                <ShieldCheck size={16} aria-hidden="true" /> Administrador {level}
              </span>
            </div>
          </Card>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <Card className="min-w-0 space-y-5 border border-line-subtle">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <UserRound size={20} className="text-brand-primary" aria-hidden="true" />
                    Informações da conta
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">Dados vinculados à sua sessão administrativa.</p>
                </div>
                {!vm.isEditing && (
                  <Button variant="outline" onClick={vm.openEdit}>
                    <Pencil size={16} aria-hidden="true" /> Editar dados
                  </Button>
                )}
              </div>
              {vm.profileSuccess && <p role="status" className="flex items-center gap-2 text-sm text-brand-primary">
                <CheckCircle2 size={17} aria-hidden="true" /> {vm.profileSuccess}
              </p>}

              {vm.isEditing ? (
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void vm.saveProfile(); }}>
                  <label className="field-label" htmlFor="profile-name">Nome completo</label>
                  <input id="profile-name" className="field-input" type="text" required minLength={3} maxLength={150}
                    autoComplete="name" value={vm.editName} disabled={vm.isSaving}
                    onChange={(event) => vm.setEditName(event.target.value)} />
                  <label className="field-label" htmlFor="profile-phone">Telefone (opcional)</label>
                  <input id="profile-phone" className="field-input" type="tel" maxLength={20} autoComplete="tel"
                    placeholder="Ex.: (75) 99999-9999" value={vm.editPhone} disabled={vm.isSaving}
                    onChange={(event) => vm.setEditPhone(event.target.value)} />
                  <p className="text-xs text-ink-secondary">Deixe o telefone vazio para removê-lo. O e-mail e o nível administrativo não podem ser alterados aqui.</p>
                  {vm.profileError && <p role="alert" className="text-sm text-red-700">{vm.profileError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" isLoading={vm.isSaving}>Salvar alterações</Button>
                    <Button type="button" variant="outline" disabled={vm.isSaving} onClick={vm.cancelEdit}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <dl className="divide-y divide-line-subtle">
                  <div className="py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <UserRound size={15} aria-hidden="true" /> Nome completo
                    </dt>
                    <dd className="mt-1 break-words font-semibold">{profile.name}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <Mail size={15} aria-hidden="true" /> E-mail de acesso
                    </dt>
                    <dd className="mt-1 break-all font-semibold">{email}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Telefone</dt>
                    <dd className="mt-1 font-semibold">{profile.phone ?? 'Não informado'}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      <CalendarDays size={15} aria-hidden="true" /> Conta criada em
                    </dt>
                    <dd className="mt-1 font-semibold">{formattedDate(profile.created_at)}</dd>
                  </div>
                </dl>
              )}
            </Card>

            <Card className="min-w-0 space-y-5 border border-line-subtle">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <LockKeyhole size={20} className="text-brand-primary" aria-hidden="true" /> Segurança
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Sua senha é pessoal. Para alterá-la, informe a senha atual e escolha uma nova.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-surface-info p-4">
                <CircleUserRound className="mt-0.5 shrink-0 text-brand-primary" size={20} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-brand-primary">Sessão autenticada</p>
                  <p className="mt-1 break-all text-sm text-ink-secondary">
                    Conectado como {email} · Perfil {level}.
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
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void vm.submitPassword(); }}>
                  <div>
                    <label htmlFor="current-password" className="field-label">Senha atual</label>
                    <input id="current-password" type="password" className="field-input" autoComplete="current-password"
                      required value={vm.currentPassword} disabled={vm.isChangingPassword}
                      onChange={(event) => vm.setCurrentPassword(event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="field-label">Nova senha</label>
                    <input id="new-password" type="password" className="field-input" autoComplete="new-password"
                      required minLength={8} maxLength={72} value={vm.newPassword} disabled={vm.isChangingPassword}
                      onChange={(event) => vm.setNewPassword(event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="field-label">Confirmar nova senha</label>
                    <input id="confirm-password" type="password" className="field-input" autoComplete="new-password"
                      required minLength={8} maxLength={72} value={vm.confirmPassword} disabled={vm.isChangingPassword}
                      onChange={(event) => vm.setConfirmPassword(event.target.value)} />
                  </div>
                  <p className="text-xs text-ink-secondary">Use de 8 a 72 caracteres e não repita a senha atual.</p>
                  {vm.passwordError && <p role="alert" className="text-sm text-red-700">{vm.passwordError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" isLoading={vm.isChangingPassword}>Confirmar nova senha</Button>
                    <Button type="button" variant="outline" disabled={vm.isChangingPassword}
                      onClick={vm.cancelChangePassword}>Cancelar</Button>
                  </div>
                </form>
              )}
              <p className="border-t border-line-subtle pt-4 text-xs text-ink-secondary">
                Esqueceu a senha atual? Encerre sua sessão e use a opção de recuperação na tela de login.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
