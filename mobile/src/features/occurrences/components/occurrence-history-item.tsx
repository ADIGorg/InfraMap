import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { HistoryEvent, OccurrenceStatus } from '@/shared/types/api';
import { formatDateTime } from '@/shared/utils/format-date';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface Props {
  event: HistoryEvent;
  isLast: boolean;
}

const STATUS_LABELS: Record<OccurrenceStatus, string> = {
  RECEIVED: 'Recebido',
  UNDER_ANALYSIS: 'Em análise',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  RESOLVED: 'Resolvido',
  REJECTED: 'Rejeitado',
};

function getString(data: Record<string, unknown> | null, keys: string[]) {
  if (!data) return null;
  for (const key of keys) {
    if (typeof data[key] === 'string' && data[key]) return data[key] as string;
  }
  return null;
}

function statusFromEvent(event: HistoryEvent): OccurrenceStatus | null {
  const value = getString(event.newData, ['status', 'newStatus', 'new_status']);
  return value && value in STATUS_LABELS ? (value as OccurrenceStatus) : null;
}

function eventPresentation(event: HistoryEvent) {
  const action = event.action.toUpperCase();
  const status = statusFromEvent(event);
  const content =
    getString(event.details, ['content', 'message', 'observation', 'response']) ??
    getString(event.newData, ['content', 'message', 'observation', 'response']);

  if (action.includes('OBSERVATION') || action.includes('CITIZEN_RESPONSE')) {
    return {
      title: 'Resposta da equipe responsável',
      description: content,
      color: colors.brand.secondary,
      icon: 'message-circle' as const,
    };
  }
  if (status) {
    return {
      title: STATUS_LABELS[status],
      description: content,
      color: colors.status[status],
      icon: 'check-circle' as const,
    };
  }
  if (action.includes('CREATED') || action.includes('REGISTERED')) {
    return {
      title: 'Ocorrência registrada',
      description: content,
      color: colors.status.RECEIVED,
      icon: 'file-text' as const,
    };
  }
  if (action.includes('LOCATION')) {
    return {
      title: 'Localização atualizada',
      description: content,
      color: colors.brand.primary,
      icon: 'map-pin' as const,
    };
  }
  if (action.includes('CLASSIFICATION')) {
    return {
      title: 'Classificação atualizada',
      description: content,
      color: colors.brand.primary,
      icon: 'tag' as const,
    };
  }
  return {
    title: 'Atualização da ocorrência',
    description: content,
    color: colors.text.secondary,
    icon: 'clock' as const,
  };
}

export function OccurrenceHistoryItem({ event, isLast }: Props) {
  const view = eventPresentation(event);
  return (
    <View style={styles.row} accessibilityLabel={`${view.title}, ${formatDateTime(event.createdAt)}`}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: view.color }]}>
          <Feather name={view.icon} size={12} color={colors.text.inverse} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.date}>{formatDateTime(event.createdAt)}</Text>
        {view.description ? <Text style={styles.description}>{view.description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 68 },
  rail: { width: 28, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border.subtle },
  content: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.base },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  date: { marginTop: 2, fontSize: typography.sizes.xs, color: colors.text.secondary },
  description: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    lineHeight: 19,
    color: colors.text.secondary,
  },
});
