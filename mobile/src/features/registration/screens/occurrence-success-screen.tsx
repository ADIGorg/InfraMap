import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RegistrationHeader } from '../components/registration-header';
import { useOccurrenceSuccessViewModel } from '../view-models/use-occurrence-success-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceSuccessScreen() {
  const vm = useOccurrenceSuccessViewModel();

  if (!vm.isConfirmed) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Feather
              name="alert-triangle"
              size={44}
              color={colors.status.REJECTED}
            />
          </View>
          <Text style={styles.errorTitle}>Envio não confirmado</Text>
          <Text style={styles.errorText}>
            O servidor não retornou um identificador válido. A ocorrência não
            será apresentada como concluída.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, styles.errorButton]}
            onPress={vm.returnToLocation}
            accessibilityRole="button"
            accessibilityLabel="Voltar para localização"
          >
            <Text style={styles.primaryButtonText}>Voltar para localização</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <RegistrationHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.successIcon}>
          <Feather
            name="check"
            size={48}
            color={colors.brand.secondary}
          />
        </View>

        <Text style={styles.title}>Ocorrência enviada!</Text>
        <Text style={styles.message}>
          Sua ocorrência foi registrada com sucesso. Acompanhe as atualizações
          em Minhas ocorrências.
        </Text>

        <View style={styles.recordCard}>
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Número do registro</Text>
            <Text style={styles.protocol}>{vm.protocol}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Status inicial</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{vm.statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={vm.viewMyOccurrences}
            accessibilityRole="button"
            accessibilityLabel="Ver minhas ocorrências"
          >
            <Text style={styles.primaryButtonText}>Ver minhas ocorrências</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={vm.returnToMap}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao mapa"
          >
            <Text style={styles.secondaryButtonText}>Voltar ao mapa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },

  content: {
    flexGrow: 1,
    paddingBottom: spacing.base,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.brand.secondary,
    backgroundColor: '#EAFAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.xl,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    fontSize: typography.sizes.base,
    lineHeight: 22,
    textAlign: 'center',
  },
  recordCard: {
    width: '100%',
    marginTop: spacing['2xl'],
    padding: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  recordRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recordLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  protocol: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
    backgroundColor: colors.border.subtle,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: '#F2F3F4',
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  footer: { width: '100%', marginTop: 'auto', paddingTop: spacing.xl, gap: spacing.xs },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorButton: { marginTop: spacing.xl },
  errorTitle: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.base,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.text.secondary,
  },
});
