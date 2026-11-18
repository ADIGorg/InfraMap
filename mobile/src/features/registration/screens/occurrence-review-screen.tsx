import React from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RegistrationStepper } from '../components/registration-stepper';
import { CategorySelectModal } from '../components/category-select-modal';
import { ReviewPhotoCard } from '../components/review-photo-card';
import { ReviewCategoryCard } from '../components/review-category-card';
import { ReviewDescriptionCard } from '../components/review-description-card';
import { useOccurrenceReviewViewModel } from '../view-models/use-occurrence-review-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceReviewScreen() {
  const vm = useOccurrenceReviewViewModel();
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.brand}>InfraMap</Text><Text style={styles.headerTitle}>Nova ocorrência</Text></View><RegistrationStepper currentStep={3} />
    <Text style={styles.title}>Revisão da ocorrência</Text><Text style={styles.subtitle}>Confira tudo antes de ir para a localização.</Text>
    {vm.categoryLoadError ? <View style={styles.errorBanner}><Feather name="alert-circle" size={18} color={colors.status.REJECTED} /><Text style={styles.errorText}>{vm.categoryLoadError}</Text></View> : null}
    <View style={styles.cards}><ReviewPhotoCard photos={vm.photos} onEdit={vm.editPhotos} />{vm.photoError ? <Text style={styles.inlineError}>{vm.photoError}</Text> : null}
    <ReviewCategoryCard categoryName={vm.selectedCategory?.name ?? ''} source={vm.categorySource} onEdit={() => vm.setCategoryModalOpen(true)} />{vm.categoryError ? <Text style={styles.inlineError}>{vm.categoryError}</Text> : null}
    <ReviewDescriptionCard value={vm.editedDescription} source={vm.descriptionSource} error={vm.descriptionError} isEditing={vm.isDescriptionEditing} onChange={vm.changeDescription} onToggleEdit={() => vm.setDescriptionEditing(!vm.isDescriptionEditing)} /></View>
    <TouchableOpacity style={[styles.confirmButton, vm.isLoadingCategories && styles.disabled]} onPress={vm.confirm} disabled={vm.isLoadingCategories}><>{vm.isLoadingCategories ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.confirmText}>Confirmar</Text>}</></TouchableOpacity>
    <TouchableOpacity onPress={vm.back}><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
  </ScrollView><CategorySelectModal visible={vm.isCategoryModalOpen} categories={vm.categories} selectedId={vm.editedCategoryId} onSelect={vm.selectCategory} onClose={() => vm.setCategoryModalOpen(false)} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.surface.page }, content: { paddingBottom: spacing['2xl'] }, header: { backgroundColor: colors.brand.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.base }, brand: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.extrabold }, headerTitle: { marginTop: spacing.xs, color: colors.text.inverse, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold }, title: { marginTop: spacing.xl, marginHorizontal: spacing.xl, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary }, subtitle: { marginTop: spacing.xs, marginHorizontal: spacing.xl, fontSize: typography.sizes.sm, color: colors.text.secondary }, cards: { marginTop: spacing.xl, marginHorizontal: spacing.xl, gap: spacing.md }, errorBanner: { marginHorizontal: spacing.xl, marginTop: spacing.base, padding: spacing.md, backgroundColor: '#FDEDEC', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm }, errorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.status.REJECTED }, inlineError: { marginTop: -spacing.sm, fontSize: typography.sizes.xs, color: colors.status.REJECTED }, confirmButton: { marginTop: spacing.xl, marginHorizontal: spacing.xl, height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }, confirmText: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }, disabled: { opacity: 0.5 }, backText: { marginTop: spacing.base, textAlign: 'center', color: colors.brand.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold } });
