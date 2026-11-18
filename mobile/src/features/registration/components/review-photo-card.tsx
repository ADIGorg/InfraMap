import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CapturedPhoto } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function ReviewPhotoCard({ photos, onEdit }: { photos: CapturedPhoto[]; onEdit: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Fotos</Text>
        <TouchableOpacity onPress={onEdit} accessibilityRole="button" accessibilityLabel="Editar fotos">
          <Text style={styles.edit}>Editar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.photos}>
        {photos.map((photo, index) => (
          <Image key={`${photo.uri}-${index}`} source={{ uri: photo.uri }} style={styles.photo} accessibilityLabel={`Evidência ${index + 1}`} />
        ))}
        <View style={styles.count}>
          <Feather name="camera" size={20} color={colors.brand.primary} />
          <Text style={styles.countText}>{photos.length} {photos.length === 1 ? 'foto enviada' : 'fotos enviadas'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border.subtle, padding: spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text.primary },
  edit: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.brand.primary },
  photos: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photo: { width: 72, height: 72, borderRadius: radius.lg },
  count: { flex: 1, minHeight: 72, borderRadius: radius.lg, backgroundColor: colors.surface.noticeInfo, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  countText: { marginTop: spacing.xs, fontSize: typography.sizes.xs, textAlign: 'center', color: colors.brand.primary },
});
