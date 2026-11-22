import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RegistrationHeader } from '../components/registration-header';
import { RegistrationStepper } from '../components/registration-stepper';
import { CategorySelectModal } from '../components/category-select-modal';
import { ReviewPhotoCard } from '../components/review-photo-card';
import { ReviewCategoryCard } from '../components/review-category-card';
import { ReviewDescriptionCard } from '../components/review-description-card';
import { useOccurrenceReviewViewModel } from '../view-models/use-occurrence-review-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceReviewScreen() {
  const vm = useOccurrenceReviewViewModel();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RegistrationHeader />
        <RegistrationStepper currentStep={3} />
        <Text style={styles.title}>Revisão da ocorrência</Text>
        <Text style={styles.subtitle}>Confira tudo antes de ir para a localização.</Text>

        {vm.categoryLoadError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={18} color={colors.status.REJECTED} />
            <Text style={styles.errorText}>{vm.categoryLoadError}</Text>
          </View>
        ) : null}

        <View style={styles.cards}>
          <ReviewPhotoCard photos={vm.photos} onEdit={vm.editPhotos} />
          {vm.photoError ? <Text style={styles.inlineError}>{vm.photoError}</Text> : null}
          <ReviewCategoryCard
            categoryName={vm.selectedCategory?.name ?? ''}
            source={vm.categorySource}
            onEdit={() => vm.setCategoryModalOpen(true)}
          />
          {vm.categoryError ? <Text style={styles.inlineError}>{vm.categoryError}</Text> : null}
          <ReviewDescriptionCard
            value={vm.editedDescription}
            source={vm.descriptionSource}
            error={vm.descriptionError}
            isEditing={vm.isDescriptionEditing}
            onChange={vm.changeDescription}
            onToggleEdit={() => vm.setDescriptionEditing(!vm.isDescriptionEditing)}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, vm.isLoadingCategories && styles.disabled]}
            onPress={vm.confirm}
            disabled={vm.isLoadingCategories}
            accessibilityRole="button"
          >
            {vm.isLoadingCategories
              ? <ActivityIndicator color={colors.text.inverse} />
              : <Text style={styles.confirmText}>Confirmar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={vm.back} accessibilityRole="button">
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CategorySelectModal
        visible={vm.isCategoryModalOpen}
        categories={vm.categories}
        selectedId={vm.editedCategoryId}
        onSelect={vm.selectCategory}
        onClose={() => vm.setCategoryModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  content: { flexGrow: 1, paddingBottom: spacing.base },
  footer: { marginTop: 'auto', paddingTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.xl, marginHorizontal: spacing.xl, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, marginHorizontal: spacing.xl, fontSize: typography.sizes.sm, color: colors.text.secondary },
  cards: { marginTop: spacing.xl, marginHorizontal: spacing.xl, gap: spacing.md },
  errorBanner: { marginHorizontal: spacing.xl, marginTop: spacing.base, padding: spacing.md, backgroundColor: '#FDEDEC', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm },
  errorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.status.REJECTED },
  inlineError: { marginTop: -spacing.sm, fontSize: typography.sizes.xs, color: colors.status.REJECTED },
  confirmButton: { minHeight: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  disabled: { opacity: 0.5 },
  backText: { textAlign: 'center', color: colors.brand.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
