import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '@/navigation/types';
import { usePublicOccurrenceDetailViewModel } from '../view-models/use-public-occurrence-detail-view-model';
import { StatusBadge } from '../components/status-badge';
import { PhotoGallery } from '../components/photo-gallery';
import { MiniMap } from '../components/mini-map';
import { VoteButton } from '../components/vote-button';
import { BackHeader } from '@/shared/components/back-header';
import { formatDate } from '@/shared/utils/format-date';
import { colors, typography, spacing, radius } from '@/shared/theme';

type RouteT = RouteProp<RootStackParamList, 'PublicOccurrenceDetail'>;

export function PublicOccurrenceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useRoute<RouteT>().params;
  const vm = usePublicOccurrenceDetailViewModel({ id });

  if (vm.isLoading && !vm.detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (vm.loadError && !vm.detail) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color={colors.status.REJECTED} />
        <Text style={styles.errorText}>{vm.loadError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void vm.reload()}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!vm.detail) return null;

  const d = vm.detail;

  return (
    <View style={styles.container}>
      <BackHeader
        title="Detalhes da ocorrência"
        onBack={vm.goBack}
        style={[styles.header, { marginTop: insets.top + spacing.md }]}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.categoryTitle}>{d.category.name}</Text>
        <View style={styles.statusRow}>
          <StatusBadge status={d.status} />
        </View>

        <Text style={styles.sectionLabel}>Descrição</Text>
        <Text style={styles.description}>{d.description}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Categoria</Text>
            <Text style={styles.infoValue}>{d.category.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data de registro</Text>
            <Text style={styles.infoValue}>{formatDate(d.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Localização aproximada</Text>
        <Text style={styles.approxHint}>
          A coordenada exata não é divulgada por privacidade.
        </Text>
        <MiniMap location={d.location} />

        <Text style={styles.sectionLabel}>Evidências</Text>
        <PhotoGallery photos={d.photoUrls} onPhotoExpired={vm.reload} />

        {vm.voteError && (
          <View style={styles.voteError}>
            <Feather name="alert-circle" size={16} color={colors.status.REJECTED} />
            <Text style={styles.voteErrorText}>{vm.voteError}</Text>
          </View>
        )}

        <View style={styles.voteSpacing}>
          <VoteButton
            votesCount={d.votesCount}
            hasVoted={vm.hasVoted}
            isLoading={vm.isVoting}
            onPress={vm.handleVoteToggle}
          />
        </View>
      </ScrollView>

      <Modal
        visible={vm.isLoginPromptOpen}
        transparent
        animationType="fade"
        onRequestClose={vm.handleCloseLoginPrompt}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Faça login para votar</Text>
            <Text style={styles.modalBody}>
              Você precisa estar autenticado para apoiar ocorrências da comunidade.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={vm.handleCloseLoginPrompt}
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryText}>Agora não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={vm.handleLoginFromPrompt}
                accessibilityRole="button"
                accessibilityLabel="Ir para o login"
              >
                <Text style={styles.modalPrimaryText}>Ir para o login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: { marginHorizontal: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  categoryTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.brand.primary,
    marginBottom: spacing.sm,
  },
  statusRow: { flexDirection: 'row', marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },
  approxHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  voteError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FDEDEC',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  voteErrorText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.status.REJECTED,
  },
  voteSpacing: { marginTop: spacing.lg },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalSecondary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  modalSecondaryText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  modalPrimary: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  modalPrimaryText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
