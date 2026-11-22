import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PublicOccurrenceListItem } from '@/shared/types/api';
import { useOccurrencePreviewViewModel } from '../view-models/use-occurrence-preview-view-model';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  occurrence: PublicOccurrenceListItem | null;
  onClose: () => void;
  onViewDetails: (id: string) => void;
}

export function OccurrencePreviewSheet({ occurrence, onClose, onViewDetails }: Props) {
  const vm = useOccurrencePreviewViewModel({ occurrence, onClose, onViewDetails });

  if (!vm.isOpen) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={vm.handleClose}
      accessibilityViewIsModal
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={vm.handleClose}
        accessibilityLabel="Fechar detalhes"
      >
        <View
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
          accessible
          accessibilityLabel={`Ocorrência: ${vm.categoryName}. ${vm.locationLabel}. ${vm.statusLabel}`}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.category}>{vm.categoryName}</Text>
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>{vm.statusLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={vm.handleClose}
              accessibilityLabel="Fechar"
              accessibilityRole="button"
            >
              <Feather name="x" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.text.secondary} />
            <Text style={styles.locationText}>{vm.locationLabel}</Text>
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {vm.description}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.votes}>{vm.votesCount} votos</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={vm.handleViewDetails}
              accessibilityRole="button"
              accessibilityLabel="Ver detalhes da ocorrência"
            >
              <Text style={styles.primaryButtonText}>Ver detalhes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
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
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  category: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    flexShrink: 1,
  },
  statusChip: {
    backgroundColor: colors.surface.noticeInfo,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: colors.brand.primary,
    fontWeight: typography.weights.semibold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.base,
  },
  footer: {
    gap: spacing.md,
  },
  votes: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
