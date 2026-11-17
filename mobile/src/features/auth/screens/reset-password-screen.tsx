import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResetPasswordViewModel } from '@/features/auth/view-models/use-reset-password-view-model';
import { InputField } from '@/shared/components/input-field';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function ResetPasswordScreen() {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isPasswordVisible,
    togglePasswordVisibility,
    isConfirmVisible,
    toggleConfirmVisibility,
    isLoading,
    isSuccess,
    formErrors,
    clearError,
    handleSubmit,
    goToApp,
  } = useResetPasswordViewModel();

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={48} color={colors.brand.primary} />
          </View>
          <Text style={styles.successTitle}>Senha atualizada!</Text>
          <Text style={styles.successBody}>
            Sua senha foi redefinida com sucesso. Você já está autenticado.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goToApp}
            accessibilityRole="button"
            accessibilityLabel="Continuar para o app"
          >
            <Text style={styles.primaryButtonText}>Continuar para o app</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Feather name="map-pin" size={24} color={colors.text.inverse} />
              </View>
              <Text style={styles.logoText}>InfraMap</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">Nova senha</Text>
          </View>

          <Text style={styles.description}>
            Escolha uma nova senha para sua conta. Use pelo menos 8 caracteres.
          </Text>

          {formErrors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formErrors.general}</Text>
            </View>
          )}

          <InputField
            label="Nova senha"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError('password');
            }}
            placeholder="Digite sua nova senha"
            secureTextEntry={!isPasswordVisible}
            error={formErrors.password}
            accessibilityLabel="Campo de nova senha"
            rightIcon={
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                accessibilityLabel={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Feather
                  name={isPasswordVisible ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            }
          />

          <InputField
            label="Confirmar senha"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              clearError('confirmPassword');
            }}
            placeholder="Digite a senha novamente"
            secureTextEntry={!isConfirmVisible}
            error={formErrors.confirmPassword}
            accessibilityLabel="Campo de confirmação de senha"
            rightIcon={
              <TouchableOpacity
                onPress={toggleConfirmVisibility}
                accessibilityLabel={isConfirmVisible ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              >
                <Feather
                  name={isConfirmVisible ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Atualizar senha"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Atualizar senha</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['2xl'],
  },
  header: { marginBottom: spacing.lg },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logoText: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
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
  primaryButton: {
    backgroundColor: colors.brand.primary,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  successContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface.noticeInfo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successBody: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
});