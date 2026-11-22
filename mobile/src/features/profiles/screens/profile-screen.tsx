import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useProfileViewModel } from '../view-models/use-profile-view-model';
import { EditProfileModal } from '../components/edit-profile-modal';
import { ChangePasswordModal } from '../components/change-password-modal';
import { DeleteAccountModal } from '../components/delete-account-modal';
import { LogoutConfirmModal } from '../components/logout-confirm-modal';
import { colors, typography, spacing, radius } from '@/shared/theme';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const vm = useProfileViewModel();

  if (vm.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (vm.loadError || !vm.profile) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color={colors.status.REJECTED} />
        <Text style={styles.errorText}>{vm.loadError ?? 'Perfil indisponível.'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={vm.reload}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Feather name="map-pin" size={20} color={colors.brand.primary} />
            </View>
            <Text style={styles.logoText}>InfraMap</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(vm.profile.name)}</Text>
          </View>
          <Text style={styles.name}>{vm.profile.name}</Text>
          <Text style={styles.email}>{vm.profile.email ?? '—'}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.row}
              onPress={vm.openEdit}
              accessibilityRole="button"
              accessibilityLabel="Editar nome e telefone"
            >
              <View style={styles.rowIcon}>
                <Feather name="edit-2" size={20} color={colors.brand.primary} />
              </View>
              <Text style={styles.rowLabel}>Editar nome e telefone</Text>
              <Feather name="chevron-right" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={vm.openPassword}
              accessibilityRole="button"
              accessibilityLabel="Alterar senha"
            >
              <View style={styles.rowIcon}>
                <Feather name="lock" size={20} color={colors.brand.primary} />
              </View>
              <Text style={styles.rowLabel}>Alterar senha</Text>
              <Feather name="chevron-right" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={vm.openDelete}
              accessibilityRole="button"
              accessibilityLabel="Excluir conta"
            >
              <View style={styles.rowIcon}>
                <Feather name="trash-2" size={20} color={colors.status.REJECTED} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.status.REJECTED }]}>
                Excluir conta
              </Text>
              <Feather name="chevron-right" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={vm.openLogout}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={vm.isEditOpen}
        profile={vm.profile}
        name={vm.editName}
        phone={vm.editPhone}
        errors={vm.editErrors}
        isSaving={vm.isSaving}
        onChangeName={vm.setEditName}
        onChangePhone={vm.setEditPhone}
        onClearError={vm.clearEditError}
        onCancel={vm.closeEdit}
        onSubmit={vm.submitEdit}
      />

      <ChangePasswordModal
        visible={vm.isPasswordOpen}
        currentPassword={vm.currentPassword}
        newPassword={vm.newPassword}
        confirmPassword={vm.confirmPassword}
        errors={vm.passwordErrors}
        isLoading={vm.isChangingPassword}
        isSuccess={vm.passwordSuccess}
        setCurrentPassword={vm.setCurrentPassword}
        onChangeNewPassword={vm.setNewPassword}
        onChangeConfirmPassword={vm.setConfirmPassword}
        onClearError={vm.clearPasswordError}
        onCancel={vm.closePassword}
        onSubmit={vm.submitPassword}
      />

      <DeleteAccountModal
        visible={vm.isDeleteOpen}
        acknowledged={vm.deleteAcknowledged}
        isLoading={vm.isDeleting}
        error={vm.deleteError}
        onAcknowledgedChange={vm.setDeleteAcknowledged}
        onCancel={vm.closeDelete}
        onConfirm={vm.confirmDelete}
      />

      <LogoutConfirmModal
        visible={vm.isLogoutOpen}
        isLoading={vm.isLoggingOut}
        onCancel={vm.closeLogout}
        onConfirm={vm.confirmLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.text.inverse,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  logoText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    color: colors.text.inverse,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand.secondary,
    borderWidth: 3,
    borderColor: colors.surface.noticeInfo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  email: {
    fontSize: typography.sizes.sm,
    color: colors.text.sidebar,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  actionCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  rowIcon: { width: 32, marginRight: spacing.sm },
  rowLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  divider: {
    marginHorizontal: spacing.base,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  logoutButton: {
    marginTop: spacing.xl,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
