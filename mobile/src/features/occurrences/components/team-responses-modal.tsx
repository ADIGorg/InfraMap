import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { BackHeader } from '@/shared/components/back-header';
import { formatDateTime } from '@/shared/utils/format-date';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { getTeamResponses, type TeamResponse } from '../services/team-responses.service';

interface TeamResponsesModalProps {
  occurrenceId: string | null;
  openedResponse?: TeamResponse;
  onClose: () => void;
  onViewOccurrence?: () => void;
}

export function TeamResponsesModal({ occurrenceId, openedResponse, onClose, onViewOccurrence }: TeamResponsesModalProps) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const canLoad = Boolean(userId && occurrenceId);
  const responsesQuery = useInfiniteQuery({
    queryKey: ['team-responses', userId, occurrenceId],
    queryFn: userId && occurrenceId
      ? ({ pageParam, signal }) => getTeamResponses(occurrenceId, pageParam, signal)
      : skipToken,
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    refetchOnMount: 'always',
  });

  const replies = new Map<string, TeamResponse>();
  if (openedResponse) replies.set(openedResponse.id, openedResponse);
  for (const page of responsesQuery.data?.pages ?? []) {
    for (const reply of page.responses) {
      if (
        openedResponse?.content === reply.content &&
        Date.parse(openedResponse.created_at) === Date.parse(reply.created_at)
      ) continue;
      replies.set(reply.id, reply);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.safeArea}>
        <SafeAreaView style={styles.safeArea} accessibilityViewIsModal>
          <BackHeader title="Respostas da equipe" onBack={onClose} style={styles.header} />
          <FlatList
            data={[...replies.values()]}
            keyExtractor={(reply) => reply.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
                <Text style={styles.message} selectable>{item.content}</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              !responsesQuery.isError && !(canLoad && responsesQuery.isPending)
                ? <Text style={styles.stateText}>Ainda não há respostas para esta ocorrência.</Text>
                : undefined
            }
            ListFooterComponent={
              canLoad && (responsesQuery.isPending || responsesQuery.isFetchingNextPage) ? (
                <ActivityIndicator accessibilityLabel="Carregando respostas" style={styles.loader} color={colors.brand.primary} />
              ) : responsesQuery.isError ? (
                <View style={styles.loader}>
                  <Text accessibilityRole="alert" style={styles.stateText}>Não foi possível carregar as respostas.</Text>
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => void (responsesQuery.isFetchNextPageError
                      ? responsesQuery.fetchNextPage()
                      : responsesQuery.refetch())}
                    accessibilityRole="button"
                  >
                    <Text style={styles.actionText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : responsesQuery.hasNextPage ? (
                <TouchableOpacity style={styles.action} onPress={() => void responsesQuery.fetchNextPage()} accessibilityRole="button">
                  <Text style={styles.actionText}>Carregar mais respostas</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
          {onViewOccurrence ? (
            <TouchableOpacity style={styles.occurrenceButton} onPress={onViewOccurrence} accessibilityRole="button">
              <Text style={styles.occurrenceButtonText}>Ver ocorrência</Text>
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  header: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  list: { padding: spacing.lg },
  card: { padding: spacing.base, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border.subtle, backgroundColor: colors.surface.card, gap: spacing.sm },
  date: { fontSize: typography.sizes.sm, color: colors.text.secondary },
  message: { fontSize: typography.sizes.lg, lineHeight: 24, color: colors.text.primary },
  separator: { height: spacing.md },
  loader: { marginTop: spacing.lg },
  stateText: { textAlign: 'center', fontSize: typography.sizes.base, color: colors.text.secondary },
  action: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  actionText: { color: colors.brand.primary, fontWeight: typography.weights.semibold },
  occurrenceButton: { margin: spacing.lg, marginTop: spacing.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand.primary, borderRadius: radius.lg },
  occurrenceButtonText: { color: colors.text.inverse, fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
});
