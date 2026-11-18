import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/shared/theme';
import { InputField } from '@/shared/components/input-field';

interface Props {
  visible: boolean;

  currentPassword: string;
  newPassword: string;
  confirmPassword: string;

  errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  };

  isLoading: boolean;
  isSuccess: boolean;

  setCurrentPassword: (
    value: string,
  ) => void;

  onChangeNewPassword: (
    value: string,
  ) => void;

  onChangeConfirmPassword: (
    value: string,
  ) => void;

  onClearError: (
    field:
      | 'currentPassword'
      | 'newPassword'
      | 'confirmPassword'
  ) => void;

  onCancel: () => void;
  onSubmit: () => void;
}

export function ChangePasswordModal({
  visible,
  currentPassword, 
  setCurrentPassword,
  newPassword,
  confirmPassword,
  errors,
  isLoading,
  isSuccess,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onClearError,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {isSuccess ? (
            <View style={styles.successContent}>
              <View style={styles.successIcon}>
                <Feather name="check" size={36} color={colors.brand.primary} />
              </View>
              <Text style={styles.successTitle}>Senha alterada</Text>
              <Text style={styles.successBody}>
                Sua senha foi atualizada com sucesso.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onCancel}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Alterar senha</Text>
                <TouchableOpacity onPress={onCancel} disabled={isLoading} accessibilityLabel="Fechar">
                  <Feather name="x" size={22} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {errors.general && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              <InputField
                label="Senha atual"
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  onClearError('currentPassword');
                }}
                placeholder="Digite sua senha atual"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                error={errors.currentPassword}
                editable={!isLoading}
                accessibilityLabel="Senha atual"
              />

              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                style={[styles.input, errors.newPassword && styles.inputError]}
                value={newPassword}
                onChangeText={(v) => {
                  onChangeNewPassword(v);
                  onClearError('newPassword');
                }}
                placeholder="Digite sua nova senha"
                secureTextEntry
                accessibilityLabel="Campo de nova senha"
                editable={!isLoading}
              />
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

              <Text style={styles.label}>Confirmar senha</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
                onChangeText={(v) => {
                  onChangeConfirmPassword(v);
                  onClearError('confirmPassword');
                }}
                placeholder="Digite a senha novamente"
                secureTextEntry
                accessibilityLabel="Campo de confirmação de senha"
                editable={!isLoading}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onCancel}
                  disabled={isLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.disabled]}
                  onPress={onSubmit}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar senha"
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.text.inverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Alterar senha</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: 48,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.status.REJECTED },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.status.REJECTED,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#FDEDEC',
    borderLeftWidth: 4,
    borderLeftColor: colors.status.REJECTED,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    color: colors.status.REJECTED,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    height: 44,
    minWidth: 100,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.6 },
  successContent: { alignItems: 'center' },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.noticeInfo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  successBody: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});