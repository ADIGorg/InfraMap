import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePublicMapViewModel } from '../view-models/use-public-map';
import { OSMMapView } from '../components/osm-map-view';
import { OccurrencePin } from '../components/occurrence-pin';
import { OccurrencePreviewSheet } from '../components/occurrence-preview-sheet';
import { CategoryFilter } from '../components/category-filter';
import { colors, typography, spacing, radius } from '@/shared/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { NotificationBellButton } from '@/features/notifications/components/notification-bell-button';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function PublicMapScreen() {
  const navigation = useNavigation<NavProp>();
  const vm = usePublicMapViewModel();
  const { session } = useAuth();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('AuthStack', {
      screen: 'Welcome',
    });
  };

  return (
    <View style={styles.container}>
      <OSMMapView
        centerCoordinate={vm.centerCoordinate}
        zoomLevel={vm.zoomLevel}
        onRegionDidChange={vm.onRegionDidChange}
      >
        {vm.occurrences.map((occ) => (
          <OccurrencePin
            key={occ.id}
            occurrence={occ}
            onPress={vm.selectPin}
          />
        ))}
      </OSMMapView>

      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            {!session ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                hitSlop={{
                  top: 12,
                  right: 12,
                  bottom: 12,
                  left: 12,
                }}
              >
                <Feather
                  name="arrow-left"
                  size={24}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>
            ) : null}

            <Text style={styles.headerTitle}>
              Mapa de ocorrências
            </Text>
            {session ? <NotificationBellButton /> : null}
          </View>

          <CategoryFilter
            categories={vm.categories}
            selectedId={vm.categoryId}
            onChange={vm.setCategoryId}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={vm.requestLocation}
        accessibilityLabel="Centralizar na minha localização"
      >
        <Feather name="crosshair" size={22} color={colors.brand.primary} />
      </TouchableOpacity>

      {vm.isLoading && vm.occurrences.length === 0 && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      )}

      {vm.error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={colors.status.REJECTED} />
          <Text style={styles.errorText}>{vm.error}</Text>
        </View>
      )}

      {!vm.isLoading && vm.occurrences.length === 0 && !vm.error && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>Nenhuma ocorrência nesta área.</Text>
        </View>
      )}

      <OccurrencePreviewSheet
        occurrence={vm.selectedPin}
        onClose={() => vm.selectPin(null)}
        onViewDetails={(id) =>
          navigation.navigate('PublicOccurrenceDetail', { id })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerCard: {
    backgroundColor: colors.surface.card,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
  minHeight: 40,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.base,
  marginBottom: spacing.sm,
  },

  backButton: {
    width: 40,
    height: 40,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface.page,
  },

  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.brand.primary,
  },
  locationButton: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing['2xl'],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing.base,
    right: spacing.base,
    backgroundColor: '#FDEDEC',
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.status.REJECTED,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
});