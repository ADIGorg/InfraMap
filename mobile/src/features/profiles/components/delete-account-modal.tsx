import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Checkbox } from '@/shared/components/checkbox';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  visible: boolean;
  acknowledged: boolean;
  isLoading: boolean;
  error: string | null;
  onAcknowledgedChange: (v: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  visible,
  acknowledged,
  isLoading,
  error,
  onAcknowledgedChange,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Excluir conta</Text>
            <TouchableOpacity onPress={onCancel} disabled={isLoading} accessibilityLabel="Fechar">
              <Feather name="x" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.warningBox}>
            <Feather name="alert-triangle" size={20} color={colors.status.REJECTED} />
            <Text style={styles.warningText}>
              Essa ação desativa sua conta e não pode ser desfeita.
            </Text>
          </View>

          <Text style={styles.retentionText}>
            Seu nome e e-mail serão anonimizados. Suas ocorrências e fotos
            serão mantidas para fins de rastreabilidade urbana, mas não poderão
            mais ser vinculadas a você.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.checkboxWrapper}>
            <Checkbox
              checked={acknowledged}
              onChange={onAcknowledgedChange}
              error={undefined}
            >
              <Text style={styles.checkboxText}>
                Entendo que minhas ocorrências e fotos serão mantidas de forma anônima.
              </Text>
            </Checkbox>
          </View>

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
              style={[
                styles.dangerButton,
                (!acknowledged || isLoading) && styles.disabled,
              ]}
              onPress={onConfirm}
              disabled={!acknowledged || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Excluir minha conta"
              accessibilityState={{ disabled: !acknowledged || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.dangerButtonText}>Sim, excluir minha conta</Text>
              )}
            </TouchableOpacity>
          </View>
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FDEDEC',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.status.REJECTED,
    fontWeight: typography.weights.medium,
  },
  retentionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  checkboxWrapper: { marginBottom: spacing.md },
  checkboxText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
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
    flexWrap: 'wrap',
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
  dangerButton: {
    backgroundColor: colors.status.REJECTED,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.6 },
});