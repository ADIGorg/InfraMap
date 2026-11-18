import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CapturedPhoto } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function PhotoSlots({ photos, onRemove }: { photos: CapturedPhoto[]; onRemove: (index: number) => void }) {
  return (
    <View>
      <View style={styles.row}>
        {[0, 1, 2].map((index) => {
          const photo = photos[index];
          return (
            <View key={index} style={styles.slot}>
              {photo ? (
                <>
                  <Image source={{ uri: photo.uri }} style={styles.image} accessibilityLabel={`Foto ${index + 1}`} />
                  <TouchableOpacity style={styles.remove} onPress={() => onRemove(index)} accessibilityRole="button" accessibilityLabel={`Remover foto ${index + 1}`}>
                    <Feather name="x" size={14} color={colors.text.inverse} />
                  </TouchableOpacity>
                </>
              ) : (
                <Feather name="image" size={24} color={colors.border.default} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.counterRow}>
        <Text style={styles.label}>Fotos enviadas</Text>
        <Text style={styles.counter}>{photos.length} / 3</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  slot: { flex: 1, aspectRatio: 1, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  image: { width: '100%', height: '100%', borderRadius: radius.lg },
  remove: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: radius.full, backgroundColor: colors.status.REJECTED, alignItems: 'center', justifyContent: 'center' },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  label: { fontSize: typography.sizes.sm, color: colors.text.secondary },
  counter: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.brand.primary },
});
