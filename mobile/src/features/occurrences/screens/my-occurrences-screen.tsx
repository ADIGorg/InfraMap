import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useMyOccurrencesViewModel } from '../view-models/use-my-occurrences-view-model';
import { OccurrenceCard } from '../components/occurrence-card';
import { ScreenTitle } from '@/shared/components/screen-title';
import { colors, typography, spacing, radius } from '@/shared/theme';

export function MyOccurrencesScreen() {
  const vm = useMyOccurrencesViewModel();

  if (vm.isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.status.REJECTED} />
          <Text style={styles.errorText}>{vm.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={vm.refresh}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <ScreenTitle>Minhas ocorrências</ScreenTitle>
        <Text style={styles.subtitle}>Acompanhe o andamento dos seus relatos</Text>
      </View>

      <FlatList
        data={vm.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OccurrenceCard occurrence={item} onPress={vm.openDetail} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={colors.brand.primary}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>
              Você ainda não registrou nenhuma ocorrência.
            </Text>
          </View>
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <ActivityIndicator
              style={styles.footerLoader}
              color={colors.brand.primary}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  list: {
    paddingTop: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
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
  footerLoader: { marginVertical: spacing.md },
});
