import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLoginViewModel } from '@/features/auth/view-models/use-login-view-model';
import { InputField } from '@/shared/components/input-field';
import { AuthToggle } from '@/shared/components/auth-toggle';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function LoginScreen() {
  const {
    email, setEmail,
    password, setPassword,
    isPasswordVisible, togglePasswordVisibility,
    isLoading, formErrors, clearError,
    handleSubmit, goToRegister, goToForgotPassword,
  } = useLoginViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Feather name="map-pin" size={24} color={colors.text.inverse} />
            </View>
            <Text style={styles.logoText}>InfraMap</Text>
          </View>

          {/* Toggle Entrar / Criar conta */}
          <AuthToggle activeTab="login" onChange={(tab) => tab === 'register' && goToRegister()} />

          {/* Texto de boas-vindas */}
          <Text style={styles.welcomeText}>Bem-vindo de volta! Acesse sua conta.</Text>

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
            onChangeText={(t) => { setEmail(t); clearError('email'); }}
            placeholder="exemplo@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={formErrors.email}
            accessibilityLabel="Campo de e-mail"
          />

          {/* Campo Senha */}
          <InputField
            label="Senha"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
            placeholder="Digite sua senha"
            secureTextEntry={!isPasswordVisible}
            error={formErrors.password}
            accessibilityLabel="Campo de senha"
            rightIcon={
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                accessibilityRole="button"
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

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Entrar na sua conta"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Link Esqueci minha senha */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={goToForgotPassword}
            accessibilityRole="link"
            accessibilityLabel="Esqueci minha senha"
          >
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta? </Text>
            <TouchableOpacity
              onPress={goToRegister}
              accessibilityRole="link"
              accessibilityLabel="Criar conta"
            >
              <Text style={styles.footerLink}>Criar conta</Text>
            </TouchableOpacity>
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
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['2xl'],
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing['2xl'] },
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
  welcomeText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginTop: spacing.lg,
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
  forgotButton: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  forgotText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  footerText: { color: colors.text.secondary, fontSize: typography.sizes.base },
  footerLink: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});