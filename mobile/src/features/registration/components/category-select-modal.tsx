import React from 'react';
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar categoria</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar categorias">
            <Feather name="x" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
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
                accessibilityState={{ selected }}
              >
                <View style={styles.optionText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.code}>{item.code}</Text>
                </View>
                {selected ? <Feather name="check" size={20} color={colors.brand.primary} /> : null}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.surface.card },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary },
  list: { padding: spacing.base, gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.lg, padding: spacing.base },
  selected: { borderColor: colors.brand.primary },
  optionText: { flex: 1 },
  name: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.text.primary },
  code: { marginTop: 2, fontSize: typography.sizes.xs, color: colors.text.secondary },
});
