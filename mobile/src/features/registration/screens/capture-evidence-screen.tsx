import React from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RegistrationStepper } from '../components/registration-stepper';
import { PhotoVisibilityControl } from '../components/photo-visibility-control';
import { PhotoSlots } from '../components/photo-slots';
import { CameraCaptureModal } from '../components/camera-capture-modal';
import { useCaptureEvidenceViewModel } from '../view-models/use-capture-evidence-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function CaptureEvidenceScreen() {
  const vm = useCaptureEvidenceViewModel();

  if (vm.isPermissionDenied) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionState}>
          <Feather name="camera-off" size={48} color={colors.status.REJECTED} />
          <Text style={styles.permissionTitle}>Câmera necessária</Text>
          <Text style={styles.permissionText}>Para registrar uma ocorrência, o InfraMap precisa de acesso à câmera do dispositivo.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={vm.openSettings} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Abrir configurações</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={vm.cancel} accessibilityRole="button">
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>InfraMap</Text>
          <Text style={styles.headerTitle}>Nova ocorrência</Text>
        </View>
        <RegistrationStepper currentStep={1} />
        <Text style={styles.title}>Evidência fotográfica</Text>
        <Text style={styles.subtitle}>Tire de 1 a 3 fotos do problema. Apenas a câmera é permitida.</Text>

        <PhotoVisibilityControl value={vm.visibility} onChange={vm.chooseVisibility} />

        {vm.error ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Feather name="alert-circle" size={18} color={colors.status.REJECTED} />
            <Text style={styles.errorText}>{vm.error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.cameraCard, !vm.canCapture && styles.disabled]}
          onPress={vm.openCamera}
          disabled={!vm.canCapture}
          accessibilityRole="button"
          accessibilityLabel="Tirar foto"
          accessibilityState={{ disabled: !vm.canCapture }}
        >
          <View style={styles.cameraIcon}>
            <Feather name="camera" size={30} color={colors.text.inverse} />
          </View>
          <Text style={styles.cameraLabel}>{vm.photos.length === 3 ? 'Limite de fotos atingido' : 'Tirar foto'}</Text>
        </TouchableOpacity>

        <PhotoSlots photos={vm.photos} onRemove={vm.removePhoto} />

        <TouchableOpacity
          style={[styles.nextButton, !vm.canContinue && styles.disabled]}
          onPress={vm.next}
          disabled={!vm.canContinue}
          accessibilityRole="button"
          accessibilityLabel="Próximo"
          accessibilityState={{ disabled: !vm.canContinue }}
        >
          {vm.isSubmitting ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.nextText}>Próximo</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={vm.cancel} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

      <CameraCaptureModal
        visible={vm.isCameraOpen}
        cameraRef={vm.cameraRef}
        preview={vm.preview}
        isCapturing={vm.isCapturing}
        onCapture={vm.takePhoto}
        onConfirm={vm.confirmPreview}
        onRetake={vm.retake}
        onClose={vm.closeCamera}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page },
  content: { paddingBottom: spacing['2xl'] },
  header: { backgroundColor: colors.brand.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.base },
  brand: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.extrabold },
  headerTitle: { marginTop: spacing.xs, color: colors.text.inverse, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  title: { marginTop: spacing.xl, marginHorizontal: spacing.xl, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, marginHorizontal: spacing.xl, marginBottom: spacing.base, fontSize: typography.sizes.sm, lineHeight: 19, color: colors.text.secondary },
  errorBanner: { marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface.card, flexDirection: 'row', gap: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.status.REJECTED },
  errorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.status.REJECTED },
  cameraCard: { margin: spacing.xl, height: 148, backgroundColor: colors.surface.card, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.subtle },
  cameraIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  cameraLabel: { marginTop: spacing.sm, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.brand.primary },
  disabled: { opacity: 0.5 },
  nextButton: { height: 48, marginHorizontal: spacing.xl, marginTop: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  backText: { marginTop: spacing.base, textAlign: 'center', color: colors.brand.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  primaryButton: { width: '100%', marginTop: spacing.xl, height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.text.inverse, fontWeight: typography.weights.bold },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permissionTitle: { marginTop: spacing.lg, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary },
  permissionText: { marginTop: spacing.sm, textAlign: 'center', lineHeight: 22, color: colors.text.secondary },
});
