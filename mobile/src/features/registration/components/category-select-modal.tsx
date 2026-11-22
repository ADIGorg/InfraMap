import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenTitle } from '@/shared/components/screen-title';
import type { CategorySummary } from '@/shared/types/api';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface Props {
  visible: boolean;
  categories: CategorySummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function CategorySelectModal({ visible, categories, selectedId, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.safeArea}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ScreenTitle style={styles.title}>Selecionar categoria</ScreenTitle>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar categorias"
            >
              <Feather name="x" size={24} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            style={styles.listSurface}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.option, selected && styles.selected]}
                  onPress={() => onSelect(item.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={item.name}
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.name}>{item.name}</Text>
                  {selected ? <Feather name="check" size={20} color={colors.brand.primary} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  title: { flex: 1 },
  closeButton: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface.noticeInfo, alignItems: 'center', justifyContent: 'center' },
  listSurface: { backgroundColor: colors.surface.page },
  list: { padding: spacing.base, gap: spacing.sm },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.lg, padding: spacing.base },
  selected: { borderColor: colors.brand.primary, backgroundColor: colors.surface.noticeInfo },
  name: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.text.primary },
});
