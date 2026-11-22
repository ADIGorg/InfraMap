import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useWelcomeViewModel } from '@/features/auth/view-models/use-welcome-view-model';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function WelcomeScreen() {
  const { navigateToLogin, navigateToRegister, navigateToExploreMap } = useWelcomeViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="map-pin" size={24} color={colors.text.inverse} />
          </View>
          <Text style={styles.logoText}>InfraMap</Text>
        </View>

        {/* Textos Principais */}
        <Text style={styles.title}>
          Sua cidade melhor, com sua participação
        </Text>
        <Text style={styles.subtitle}>
          Registre problemas de infraestrutura com foto e localização e acompanhe a cada atualização.
        </Text>

        {/* Cards de Recurso */}
        <View style={styles.featuresList}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="map-pin" size={18} color={colors.brand.primary} />
            </View>
            <Text style={styles.featureText}>Veja as ocorrências perto de você no mapa</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="camera" size={18} color={colors.brand.primary} />
            </View>
            <Text style={styles.featureText}>Envie uma foto com evidência em segundos</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="shield" size={18} color={colors.brand.primary} />
            </View>
            <Text style={styles.featureText}>Acompanhe o status até a solução</Text>
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={navigateToLogin}
            accessibilityRole="button"
            accessibilityLabel="Entrar na sua conta"
          >
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.outlineButton} 
            onPress={navigateToRegister}
            accessibilityRole="button"
            accessibilityLabel="Criar uma nova conta"
          >
            <Text style={styles.outlineButtonText}>Criar conta</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={navigateToExploreMap}
            accessibilityRole="button"
            accessibilityLabel="Explorar o mapa sem fazer login"
          >
            <Text style={styles.outlineButtonText}>Explorar o Mapa</Text>
            <Feather name="arrow-right" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.page,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
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
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  featuresList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    padding: spacing.md,
    minHeight: 64,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.surface.noticeInfo,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: spacing.md,
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  outlineButton: {
    backgroundColor: colors.surface.card,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  exploreButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  }
});
