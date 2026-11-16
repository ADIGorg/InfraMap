import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { resendConfirmationEmail } from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';
import { colors, typography, spacing, radius } from '@/shared/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      await resendConfirmationEmail(email);
      setResendMessage('E-mail reenviado! Verifique sua caixa de entrada e o spam.');
    } catch (error) {
      if (error instanceof AppError) setResendMessage(error.message);
      else setResendMessage('Erro ao reenviar. Tente novamente.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Feather name="mail" size={48} color={colors.brand.primary} />
        </View>
        <Text style={styles.title}>Verifique seu e-mail</Text>
        <Text style={styles.body}>
          Enviamos um link de confirmação para{'\n'}
          <Text style={styles.email}>{email}</Text>
          {'\n\n'}Abra o e-mail e clique no link para ativar sua conta.
        </Text>

        {resendMessage && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>{resendMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, isResending && styles.primaryButtonDisabled]}
          onPress={handleResend}
          disabled={isResending}
          accessibilityRole="button"
          accessibilityLabel="Reenviar e-mail de confirmação"
        >
          {isResending ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Reenviar e-mail</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Voltar para o login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  container: { flex: 1, padding: spacing.xl, paddingTop: spacing['4xl'] },
  iconWrapper: { alignItems: 'center', marginBottom: spacing.xl },
  title: {
    fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold,
    color: colors.brand.primary, textAlign: 'center', marginBottom: spacing.md,
  },
  body: {
    fontSize: typography.sizes.base, color: colors.text.secondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
  },
  email: { fontWeight: typography.weights.semibold, color: colors.text.primary },
  infoBanner: {
    backgroundColor: colors.surface.noticeInfo, padding: spacing.md,
    borderRadius: radius.md, marginBottom: spacing.base,
  },
  infoText: { fontSize: typography.sizes.sm, color: colors.brand.primary, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.brand.primary, height: 48, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold,
  },
  secondaryButton: {
    marginTop: spacing.md, height: 48, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.brand.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.brand.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold,
  },
});