import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { PublicPhotoUrl } from '@/shared/types/api';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  photos: PublicPhotoUrl[];
  onPhotoExpired?: () => void;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = Math.min(width * 0.7, 260);

export function PhotoGallery({ photos, onPhotoExpired }: Props) {
  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem fotos disponíveis.</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={photos}
      keyExtractor={(p) => String(p.position)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item.url }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={`Foto ${item.position + 1}`}
          onError={() => onPhotoExpired?.()}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingVertical: spacing.xs },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.page,
  },
  empty: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.page,
    borderRadius: radius.lg,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});