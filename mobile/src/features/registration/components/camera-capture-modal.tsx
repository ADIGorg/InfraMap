import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { ScreenTitle } from '@/shared/components/screen-title';
import type { CapturedPhoto } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface Props {
  visible: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  preview: CapturedPhoto | null;
  isCapturing: boolean;
  onCapture: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onClose: () => void;
}

export function CameraCaptureModal({ visible, cameraRef, preview, isCapturing, onCapture, onConfirm, onRetake, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.safeArea}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar câmera">
              <Feather name="x" size={26} color={colors.text.inverse} />
            </TouchableOpacity>
            <ScreenTitle inverse style={styles.title}>
              {preview ? 'Revisar foto' : 'Capturar evidência'}
            </ScreenTitle>
            <View style={styles.spacer} />
          </View>
          <View style={styles.previewArea}>
            {preview ? (
              <Image source={{ uri: preview.uri }} style={styles.camera} resizeMode="contain" />
            ) : (
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            )}
          </View>
          <View style={styles.actions}>
            {preview ? (
              <>
                <TouchableOpacity style={styles.secondaryButton} onPress={onRetake} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Tirar novamente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} accessibilityRole="button">
                  <Text style={styles.primaryText}>Usar foto</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.captureButton, isCapturing && styles.disabled]} onPress={onCapture} disabled={isCapturing} accessibilityRole="button" accessibilityLabel="Capturar foto">
                <Feather name="camera" size={28} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.text.primary },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  previewArea: { flex: 1 },
  camera: { flex: 1, width: '100%' },
  actions: { minHeight: 112, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center', padding: spacing.base },
  captureButton: { width: 68, height: 68, borderRadius: radius.full, backgroundColor: colors.brand.primary, borderWidth: 4, borderColor: colors.text.inverse, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  primaryButton: { flex: 1, height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { flex: 1, height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.text.inverse, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.text.inverse, fontWeight: typography.weights.bold },
  secondaryText: { color: colors.text.inverse, fontWeight: typography.weights.semibold },
});
