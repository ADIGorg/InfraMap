import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useMyOccurrenceDetailViewModel } from '../view-models/use-my-occurrence-detail-view-model';
import { StatusBadge } from '../components/status-badge';
import { PhotoGallery } from '../components/photo-gallery';
import { OccurrenceHistory } from '../components/occurrence-history';
import { formatDate } from '@/shared/utils/format-date';
import { colors, radius, spacing, typography } from '@/shared/theme';

type DetailRoute = RouteProp<RootStackParamList, 'MyOccurrenceDetail'>;

export function MyOccurrenceDetailScreen() {
  const { params } = useRoute<DetailRoute>();
  const vm = useMyOccurrenceDetailViewModel({ id: params.id });

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
        <View style={styles.header}>
          <TouchableOpacity onPress={vm.goBack} accessibilityRole="button" accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={24} color={colors.brand.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">Minha ocorrência</Text>
        </View>

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
        <OccurrenceHistory events={vm.history} />
      </ScrollView>
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
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.brand.primary },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xl },
  title: { flex: 1, fontSize: typography.sizes['2xl'], fontWeight: typography.weights.extrabold, color: colors.text.primary },
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
});
