import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSignupViewModel } from '@/features/auth/view-models/use-signup-view-model';
import { InputField } from '@/shared/components/input-field';
import { AuthToggle } from '@/shared/components/auth-toggle';
import { Checkbox } from '@/shared/components/checkbox';
import { TermsModal } from '@/features/auth/components/terms-modal';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function RegisterScreen() {
  const {
    name, setName, email, setEmail,
    password, setPassword, confirmPassword, setConfirmPassword,
    acceptedTerms, setAcceptedTerms,
    isPasswordVisible, togglePasswordVisibility,
    isConfirmPasswordVisible, toggleConfirmPasswordVisibility,
    isLoading, formErrors, clearError,
    handleSubmit, goToLogin,
  } = useSignupViewModel();

  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsInitialTab, setTermsInitialTab] = useState<'terms' | 'privacy'>('terms');

  const openTerms = (tab: 'terms' | 'privacy') => {
    setTermsInitialTab(tab);
    setTermsModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Feather name="map-pin" size={24} color={colors.text.inverse} />
            </View>
            <Text style={styles.logoText}>InfraMap</Text>
          </View>

          <AuthToggle activeTab="register" onChange={(tab) => tab === 'login' && goToLogin()} />

          <Text style={styles.subtitle}>Crie sua conta para registrar ocorrências.</Text>

          {formErrors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formErrors.general}</Text>
            </View>
          )}

          <InputField
            label="Nome completo"
            value={name}
            onChangeText={(t) => { setName(t); clearError('name'); }}
            placeholder="Digite seu nome completo"
            autoCapitalize="words"
            error={formErrors.name}
            accessibilityLabel="Campo de nome completo"
          />

          <InputField
            label="E-mail"
            value={email}
            onChangeText={(t) => { setEmail(t); clearError('email'); }}
            placeholder="exemplo@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={formErrors.email}
            accessibilityLabel="Campo de e-mail"
          />
          {!formErrors.email && (
            <Text style={styles.helperText}>Cada e-mail só pode ser usado uma vez.</Text>
          )}

          <InputField
            label="Senha"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
            placeholder="Crie uma senha forte"
            secureTextEntry={!isPasswordVisible}
            error={formErrors.password}
            accessibilityLabel="Campo de senha"
            rightIcon={
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                accessibilityLabel={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Feather name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            }
          />

          <InputField
            label="Confirmar senha"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
            placeholder="Digite a senha novamente"
            secureTextEntry={!isConfirmPasswordVisible}
            error={formErrors.confirmPassword}
            accessibilityLabel="Campo de confirmação de senha"
            rightIcon={
              <TouchableOpacity
                onPress={toggleConfirmPasswordVisibility}
                accessibilityLabel={isConfirmPasswordVisible ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              >
                <Feather name={isConfirmPasswordVisible ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            }
          />

          <Checkbox
            checked={acceptedTerms}
            onChange={(v) => { setAcceptedTerms(v); clearError('acceptedTerms'); }}
            error={formErrors.acceptedTerms}
          >
            <Text style={styles.termsText}>
              Li e concordo com os{' '}
              <Text style={styles.termsLink} onPress={() => openTerms('terms')}>
                Termos de Uso
              </Text>{' '}
              e{' '}
              <Text style={styles.termsLink} onPress={() => openTerms('privacy')}>
                Política de Privacidade
              </Text>.
            </Text>
          </Checkbox>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={goToLogin} accessibilityRole="link" accessibilityLabel="Entrar">
              <Text style={styles.footerLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        initialTab={termsInitialTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  container: {
    flexGrow: 1, padding: spacing.xl,
    paddingTop: spacing['3xl'], paddingBottom: spacing['2xl'],
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  logoIcon: {
    width: 48, height: 48, backgroundColor: colors.brand.primary,
    borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  logoText: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
  },
  subtitle: {
    fontSize: typography.sizes.base, color: colors.text.secondary,
    marginTop: spacing.lg, marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: '#FDEDEC', borderLeftWidth: 4,
    borderLeftColor: colors.status.REJECTED,
    padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.base,
  },
  errorBannerText: {
    color: colors.status.REJECTED, fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    fontSize: typography.sizes.xs, color: colors.text.secondary,
    marginTop: -spacing.sm, marginBottom: spacing.base, marginLeft: 2,
  },
  termsText: {
    fontSize: typography.sizes.sm, color: colors.text.secondary, lineHeight: 18,
  },
  termsLink: { color: colors.brand.primary, fontWeight: typography.weights.semibold },
  primaryButton: {
    backgroundColor: colors.brand.primary, height: 48, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.base,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: colors.text.inverse, fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    flexWrap: 'wrap', marginTop: spacing.xl,
  },
  footerText: { color: colors.text.secondary, fontSize: typography.sizes.base },
  footerLink: {
    color: colors.brand.primary, fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
