import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useMyOccurrenceDetailViewModel } from '../view-models/use-my-occurrence-detail-view-model';
import { StatusBadge } from '../components/status-badge';
import { PhotoGallery } from '../components/photo-gallery';
import { OccurrenceHistory } from '../components/occurrence-history';
import { TeamResponsesModal } from '../components/team-responses-modal';
import { BackHeader } from '@/shared/components/back-header';
import { formatDate } from '@/shared/utils/format-date';
import { colors, radius, spacing, typography } from '@/shared/theme';

type DetailRoute = RouteProp<RootStackParamList, 'MyOccurrenceDetail'>;

export function MyOccurrenceDetailScreen() {
  const { params } = useRoute<DetailRoute>();
  const vm = useMyOccurrenceDetailViewModel({ id: params.id });
  const [showResponses, setShowResponses] = useState(false);

  if (vm.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator testID="my-occurrence-detail-loading" size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (vm.error || !vm.detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.status.REJECTED} />
          <Text style={styles.errorText}>{vm.error ?? 'Ocorrência indisponível.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={vm.reload} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={vm.goBack} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={styles.backLink}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const detail = vm.detail;
  const coordinateLabel = `${detail.location.lat.toFixed(5)}, ${detail.location.lng.toFixed(5)}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackHeader title="Minha ocorrência" onBack={vm.goBack} style={styles.header} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{detail.category.name}</Text>
          <StatusBadge status={detail.status} />
        </View>

        <Text style={styles.sectionTitle}>Descrição</Text>
        <Text style={styles.description}>{detail.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow icon="tag" label="Categoria" value={detail.category.name} />
          <View style={styles.divider} />
          <InfoRow icon="calendar" label="Data de envio" value={formatDate(detail.createdAt)} />
          <View style={styles.divider} />
          <InfoRow icon="map-pin" label="Referência de localização" value={coordinateLabel} />
        </View>

        <Text style={styles.sectionTitle}>Evidências enviadas</Text>
        <PhotoGallery photos={detail.photoUrls} onPhotoExpired={vm.refreshPhotos} />

        <Text style={styles.sectionTitle}>Histórico da ocorrência</Text>
        <TouchableOpacity style={styles.responsesButton} onPress={() => setShowResponses(true)} accessibilityRole="button">
          <Feather name="message-circle" size={20} color={colors.brand.primary} />
          <Text style={styles.responsesLabel}>Respostas da equipe</Text>
          <Feather name="chevron-right" size={20} color={colors.brand.primary} />
        </TouchableOpacity>
        <OccurrenceHistory events={vm.history} />
      </ScrollView>
      {showResponses ? <TeamResponsesModal occurrenceId={detail.id} onClose={() => setShowResponses(false)} /> : null}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={18} color={colors.brand.primary} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: { marginBottom: spacing.xl },
  titleRow: { alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.extrabold, color: colors.brand.primary },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.secondary },
  infoCard: { marginTop: spacing.xl, padding: spacing.base, backgroundColor: colors.surface.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border.subtle },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { flex: 1, marginLeft: spacing.md },
  infoLabel: { fontSize: typography.sizes.xs, color: colors.text.secondary },
  infoValue: { marginTop: 2, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.text.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.md },
  errorText: { marginVertical: spacing.lg, textAlign: 'center', fontSize: typography.sizes.base, color: colors.text.primary },
  primaryButton: { backgroundColor: colors.brand.primary, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryButtonText: { color: colors.text.inverse, fontWeight: typography.weights.bold },
  backLink: { marginTop: spacing.lg, color: colors.brand.primary, fontWeight: typography.weights.semibold },
  responsesButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface.noticeInfo },
  responsesLabel: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.brand.primary },
});
