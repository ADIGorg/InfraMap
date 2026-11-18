import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useOccurrenceSuccessViewModel } from '../view-models/use-occurrence-success-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceSuccessScreen() {
  const vm = useOccurrenceSuccessViewModel();

  if (!vm.isConfirmed) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
            style={styles.primaryButton}
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.brand}>InfraMap</Text>
        <Text style={styles.headerTitle}>Nova ocorrência</Text>
      </View>

      <View style={styles.content}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  header: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
  },
  brand: {
    color: colors.text.inverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
  },
  headerTitle: {
    marginTop: spacing.xs,
    color: colors.text.inverse,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
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
    color: colors.status.RECEIVED,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    marginTop: spacing['2xl'],
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
    height: 48,
    marginTop: spacing.md,
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
