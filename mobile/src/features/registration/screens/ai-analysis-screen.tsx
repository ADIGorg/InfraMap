import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RegistrationHeader } from '../components/registration-header';
import { RegistrationStepper } from '../components/registration-stepper';
import { ConfidenceBadge } from '../components/confidence-badge';
import { CategorySelectModal } from '../components/category-select-modal';
import { useAiAnalysisViewModel } from '../view-models/use-ai-analysis-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function AiAnalysisScreen() {
  const vm = useAiAnalysisViewModel();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RegistrationHeader />
        <RegistrationStepper currentStep={2} />
        <Text style={styles.title}>Análise da IA</Text>
        <Text style={styles.subtitle}>Revise e edite as informações identificadas.</Text>

        {vm.isProcessing ? (
          <View style={styles.processingCard} accessibilityRole="progressbar">
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.processingTitle}>
              {vm.status === 'PROCESSING' ? 'Analisando as imagens...' : 'Aguardando processamento...'}
            </Text>
            <Text style={styles.processingText}>O processamento pode levar até 45 segundos.</Text>
          </View>
        ) : null}

        {vm.error ? (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Feather name="alert-triangle" size={30} color={colors.status.REJECTED} />
            <Text style={styles.errorTitle}>{vm.isTimedOut ? 'Análise demorando' : 'Não foi possível concluir a análise'}</Text>
            <Text style={styles.errorText}>{vm.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void vm.retry()} disabled={vm.isRetrying} accessibilityRole="button">
              {vm.isRetrying ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.retryText}>Tentar novamente</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {vm.isCompleted ? (
          <>
            {vm.isLowConfidence ? (
              <View style={styles.lowConfidenceBanner}>
                <Feather name="alert-circle" size={18} color={colors.brand.accent} />
                <Text style={styles.lowConfidenceText}>
                  A IA teve dificuldade para identificar o problema na foto. Confira a categoria e a descrição e corrija o que for preciso.
                </Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>Categoria</Text>
                {vm.selectedCategory ? (
                  <Text style={styles.aiLabel}>
                    {vm.categorySource === 'AI_CONFIRMED' ? 'Sugerido pela IA' : 'Escolhido por você'}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.select} onPress={() => vm.setCategoryModalOpen(true)} accessibilityRole="button" accessibilityLabel="Editar categoria">
                <Text style={styles.selectText}>{vm.selectedCategory?.name ?? 'Selecionar categoria'}</Text>
                <Feather name="chevron-down" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              {vm.selectedCategory && vm.categorySource === 'AI_CONFIRMED' ? (
                <ConfidenceBadge confidence={vm.confidence} />
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>Descrição</Text>
                <Text style={styles.aiLabel}>Sugerido pela IA</Text>
              </View>
              <TextInput
                style={styles.descriptionInput}
                value={vm.editedDescription}
                onChangeText={vm.editDescription}
                multiline
                maxLength={500}
                placeholder="Descreva o problema identificado"
                placeholderTextColor={colors.text.secondary}
                accessibilityLabel="Descrição da ocorrência"
              />
              <Text style={styles.counter}>{vm.editedDescription.length} / 500</Text>
              <ConfidenceBadge confidence={vm.confidence} />
            </View>

            <View style={styles.warningCard}>
              <Feather name="alert-triangle" size={18} color={colors.status.REJECTED} />
              <Text style={styles.warningText}>Revise as informações antes de confirmar. Você é responsável pela precisão dos dados.</Text>
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, !vm.isCompleted && styles.disabled]}
            onPress={vm.confirm}
            disabled={!vm.isCompleted}
            accessibilityRole="button"
            accessibilityLabel="Confirmar análise"
            accessibilityState={{ disabled: !vm.isCompleted }}
          >
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={vm.cancel} accessibilityRole="button" accessibilityLabel="Cancelar registro">
            <Text style={styles.cancelText}>Cancelar</Text>
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
  subtitle: { marginTop: spacing.xs, marginHorizontal: spacing.xl, marginBottom: spacing.base, fontSize: typography.sizes.sm, color: colors.text.secondary },
  processingCard: { margin: spacing.xl, padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.surface.card, alignItems: 'center' },
  processingTitle: { marginTop: spacing.base, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary },
  processingText: { marginTop: spacing.xs, fontSize: typography.sizes.sm, color: colors.text.secondary },
  errorCard: { margin: spacing.xl, padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.surface.card, alignItems: 'center' },
  errorTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, textAlign: 'center' },
  errorText: { marginTop: spacing.sm, fontSize: typography.sizes.sm, lineHeight: 19, color: colors.text.secondary, textAlign: 'center' },
  retryButton: { marginTop: spacing.base, minWidth: 180, height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.text.inverse, fontWeight: typography.weights.bold },
  lowConfidenceBanner: { marginHorizontal: spacing.xl, marginBottom: spacing.base, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FEF9E7', flexDirection: 'row', gap: spacing.sm },
  lowConfidenceText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 18, color: colors.text.primary },
  card: { marginHorizontal: spacing.xl, marginBottom: spacing.base, padding: spacing.base, borderRadius: radius.xl, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text.primary },
  aiLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.brand.primary,
    backgroundColor: colors.surface.noticeInfo,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  select: { minHeight: 48, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { flex: 1, fontSize: typography.sizes.base, color: colors.text.primary },
  descriptionInput: { minHeight: 120, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, padding: spacing.md, textAlignVertical: 'top', fontSize: typography.sizes.base, color: colors.text.primary },
  counter: { alignSelf: 'flex-end', fontSize: typography.sizes.xs, color: colors.text.secondary },
  warningCard: { marginHorizontal: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FDEDEC', flexDirection: 'row', gap: spacing.sm },
  warningText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 18, color: colors.status.REJECTED },
  confirmButton: { minHeight: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  disabled: { opacity: 0.5 },
  cancelText: { textAlign: 'center', color: colors.brand.primary, fontWeight: typography.weights.semibold },
});
