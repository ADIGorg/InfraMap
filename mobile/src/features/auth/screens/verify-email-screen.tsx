import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Feather,
} from '@expo/vector-icons';

import * as Linking from 'expo-linking';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type {
  AuthStackParamList,
} from '@/navigation/types';

import {
  resendConfirmationEmail,
} from '@/features/auth/services/auth.service';

import {
  AppError,
} from '@/shared/errors/app-error';

import {
  colors,
  radius,
  spacing,
  typography,
} from '@/shared/theme';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'VerifyEmail'
>;

function isConfirmationUrl(
  url: string | null,
): boolean {
  if (!url) {
    return false;
  }

  const parsed = Linking.parse(url);
  const confirmed = parsed.queryParams?.confirmed;

  return (
    confirmed === 'true'
  );
}

export function VerifyEmailScreen({
  route,
  navigation,
}: Props) {
  const receivedUrl = Linking.useURL();

  const email = route.params?.email ?? '';

  const confirmedByRoute =
    route.params?.confirmed === true;

  const confirmedByUrl = isConfirmationUrl(
    receivedUrl,
  );

  const isConfirmed =
    confirmedByRoute || confirmedByUrl;

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  const [
    resendMessage,
    setResendMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      '[VerifyEmail] URL recebida:',
      receivedUrl,
    );

    console.log(
      '[VerifyEmail] parâmetros:',
      route.params,
    );

    console.log(
      '[VerifyEmail] confirmado:',
      isConfirmed,
    );

    if (!isConfirmed) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Login',
          params: {
            emailConfirmed: true,
          },
        },
      ],
    });
  }, [
    isConfirmed,
    navigation,
    receivedUrl,
    route.params,
  ]);

  const handleResend = async (): Promise<void> => {
    if (isResending || !email) {
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      await resendConfirmationEmail(email);

      setResendMessage(
        'E-mail reenviado! Verifique sua caixa de entrada e o spam.',
      );
    } catch (error) {
      if (error instanceof AppError) {
        setResendMessage(error.message);
      } else {
        setResendMessage(
          'Erro ao reenviar. Tente novamente.',
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isConfirmed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.redirectContainer}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.redirectText}>
            E-mail confirmado. Abrindo o login...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Feather
            name="mail"
            size={48}
            color={colors.brand.primary}
          />
        </View>

        <Text style={styles.title}>
          Verifique seu e-mail
        </Text>

        <Text style={styles.body}>
          Enviamos um link de confirmação para{' '}
          {'\n'}
          <Text style={styles.email}>
            {email}
          </Text>
          {'\n\n'}
          Abra o e-mail e clique no link para ativar sua conta.
        </Text>

        {resendMessage ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              {resendMessage}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isResending && styles.primaryButtonDisabled,
          ]}
          onPress={() => {
            void handleResend();
          }}
          disabled={isResending || !email}
          accessibilityRole="button"
          accessibilityLabel="Reenviar e-mail de confirmação"
        >
          {isResending ? (
            <ActivityIndicator
              color={colors.text.inverse}
            />
          ) : (
            <Text style={styles.primaryButtonText}>
              Reenviar e-mail
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Login',
                },
              ],
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Voltar para o login"
        >
          <Text style={styles.secondaryButtonText}>
            Voltar para o login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.page,
  },

  container: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing['4xl'],
  },

  iconWrapper: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.brand.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  body: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },

  email: {
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },

  infoBanner: {
    backgroundColor: colors.surface.noticeInfo,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },

  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    textAlign: 'center',
  },

  primaryButton: {
    backgroundColor: colors.brand.primary,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },

  secondaryButton: {
    marginTop: spacing.md,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },

  redirectContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  redirectText: {
    marginTop: spacing.base,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});