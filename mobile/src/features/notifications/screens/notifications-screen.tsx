import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NotificationItem } from '../components/notification-item';
import { TeamResponsesModal } from '@/features/occurrences/components/team-responses-modal';
import { ScreenTitle } from '@/shared/components/screen-title';
import { useNotificationsViewModel } from '../view-models/use-notifications-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function NotificationsScreen() {
  const vm = useNotificationsViewModel();
  const { openedResponse } = vm;
  const responseOccurrenceId = openedResponse?.occurrence_id ?? null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>Notificações</ScreenTitle>
        <TouchableOpacity style={styles.headerAction} onPress={() => void vm.markAllRead()} disabled={vm.isMarkingAll || vm.items.length === 0} accessibilityRole="button" accessibilityLabel="Marcar todas como lidas">
          {vm.isMarkingAll ? <ActivityIndicator size="small" color={colors.brand.primary} /> : <Text style={styles.headerActionText}>Ler todas</Text>}
        </TouchableOpacity>
      </View>
      {vm.error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{vm.error}</Text></View> : null}
      {vm.isLoading && vm.items.length === 0 ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.brand.primary} /></View>
      ) : (
        <FlatList
          data={vm.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={vm.items.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => <NotificationItem notification={item} onPress={() => void vm.openNotification(item)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={vm.isLoading} onRefresh={() => void vm.reload()} colors={[colors.brand.primary]} />}
          onEndReached={() => void vm.loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={ vm.isLoadingMore ? ( <ActivityIndicator style={ styles.footerLoader } color={ colors.brand.primary } /> ) : undefined }
          ListEmptyComponent={<View style={styles.centerState}><View style={styles.emptyIcon}><Feather name="bell" size={36} color={colors.brand.primary} /></View><Text style={styles.emptyTitle}>Nenhuma notificação</Text><Text style={styles.emptyText}>As atualizações das suas ocorrências aparecerão aqui.</Text></View>}
        />
      )}
      {openedResponse ? (
        <TeamResponsesModal
          occurrenceId={responseOccurrenceId}
          openedResponse={{ id: openedResponse.id, content: openedResponse.message, created_at: openedResponse.created_at }}
          onClose={vm.closeResponse}
          onViewOccurrence={responseOccurrenceId ? () => vm.openOccurrence(responseOccurrenceId) : undefined}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  header: { minHeight: 56, paddingHorizontal: spacing.base, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  title: { flex: 1 },
  headerAction: { minWidth: 76, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  headerActionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.brand.primary },
  errorBanner: { margin: spacing.base, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FDEDEC' },
  errorText: { fontSize: typography.sizes.sm, color: colors.status.REJECTED },
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.sm },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.noticeInfo },
  emptyTitle: { marginTop: spacing.lg, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary },
  emptyText: { marginTop: spacing.sm, textAlign: 'center', fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.secondary },
  footerLoader: { marginVertical: spacing.base },
});
