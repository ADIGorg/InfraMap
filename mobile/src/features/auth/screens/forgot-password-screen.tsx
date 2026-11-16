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
import { usePasswordRecoveryViewModel } from '@/features/auth/view-models/use-password-recovery-view-model';
import { InputField } from '@/shared/components/input-field';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function ForgotPasswordScreen() {
  const {
    email,
    setEmail,
    isLoading,
    isCooldownActive,
    submitLabel,
    formErrors,
    clearError,
    handleSubmit,
    goBack,
  } = usePasswordRecoveryViewModel();

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
          {/* Header com voltar */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={26} color={colors.brand.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Esqueci minha senha</Text>
          </View>

          {/* Texto descritivo */}
          <Text style={styles.description}>
            Insira o endereço de e-mail associado à sua conta. Enviaremos um
            link seguro para você redefinir sua senha.
          </Text>

          {/* Erro geral */}
          {formErrors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formErrors.general}</Text>
            </View>
          )}

          {/* Campo E-mail */}
          <InputField
            label="E-mail"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError('email');
            }}
            placeholder="exemplo@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={formErrors.email}
            accessibilityLabel="Campo de e-mail"
          />

          {/* Botão */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isLoading || isCooldownActive) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || isCooldownActive}
            accessibilityRole="button"
            accessibilityLabel="Enviar link de recuperação"
            accessibilityState={{ disabled: isLoading || isCooldownActive }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>{submitLabel}</Text>
            )}
          </TouchableOpacity>

          {/* Banner anti-enumeração — sempre visível */}
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Feather name="info" size={20} color={colors.brand.primary} />
            </View>
            <Text style={styles.infoText}>
              Se o e-mail estiver cadastrado, você receberá as instruções em
              instantes. Verifique também sua caixa de spam.
            </Text>
          </View>
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
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
    flex: 1,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface.noticeInfo,
    padding: spacing.base,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  infoIcon: { paddingTop: 1 },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    lineHeight: 18,
  },
});