import React from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RegistrationStepper } from '../components/registration-stepper';
import { LocationPickerMap } from '../components/location-picker-map';
import { useOccurrenceLocationViewModel } from '../view-models/use-occurrence-location-view-model';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceLocationScreen() {
  const vm = useOccurrenceLocationViewModel();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.brand}>InfraMap</Text><Text style={styles.headerTitle}>Nova ocorrência</Text></View>
        <RegistrationStepper currentStep={4} />
        <Text style={styles.title}>Localização do problema</Text>
        <Text style={styles.subtitle}>Use o GPS ou selecione o ponto exato no mapa.</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => void vm.useGps()} disabled={vm.isLocating} accessibilityRole="button">
            {vm.isLocating ? <ActivityIndicator color={colors.text.inverse} /> : <><Feather name="crosshair" size={20} color={colors.text.inverse} /><Text style={styles.primaryActionText}>Usar minha localização</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={vm.openManualMap} accessibilityRole="button">
            <Feather name="map" size={20} color={colors.brand.primary} /><Text style={styles.secondaryActionText}>Selecionar no mapa</Text>
          </TouchableOpacity>
        </View>

        {vm.error ? <View style={styles.errorBanner}><Feather name="alert-circle" size={18} color={colors.status.REJECTED} /><Text style={styles.errorText}>{vm.error}</Text></View> : null}

        {vm.location ? (
          <>
            <LocationPickerMap coordinate={vm.location} onChange={vm.changeManualLocation} />
            <View style={styles.addressCard}>
              <Feather name="map-pin" size={20} color={colors.brand.primary} />
              <View style={styles.addressText}><Text style={styles.addressLabel}>{vm.locationSource === 'GPS' ? 'Localização via GPS' : 'Localização selecionada'}</Text><Text style={styles.address}>{vm.address}</Text><Text style={styles.coordinates}>{vm.location.lat.toFixed(6)}, {vm.location.lng.toFixed(6)}</Text></View>
            </View>
          </>
        ) : null}

        {vm.attemptWasAmbiguous ? <TouchableOpacity onPress={vm.goToMine} accessibilityRole="button"><Text style={styles.mineLink}>Ver Minhas ocorrências</Text></TouchableOpacity> : null}

        <TouchableOpacity style={[styles.confirmButton, !vm.canSubmit && styles.disabled]} onPress={() => void vm.submit()} disabled={!vm.canSubmit} accessibilityRole="button">
          {vm.isSubmitting ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.confirmText}>Confirmar e enviar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={vm.back} disabled={vm.isSubmitting} accessibilityRole="button"><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.page }, content: { paddingBottom: spacing['2xl'] },
  header: { backgroundColor: colors.brand.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.base }, brand: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.extrabold }, headerTitle: { marginTop: spacing.xs, color: colors.text.inverse, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  title: { marginTop: spacing.xl, marginHorizontal: spacing.xl, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text.primary }, subtitle: { marginTop: spacing.xs, marginHorizontal: spacing.xl, color: colors.text.secondary },
  actions: { margin: spacing.xl, gap: spacing.sm }, primaryAction: { height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' }, primaryActionText: { color: colors.text.inverse, fontWeight: typography.weights.bold }, secondaryAction: { height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.card }, secondaryActionText: { color: colors.brand.primary, fontWeight: typography.weights.semibold },
  errorBanner: { marginHorizontal: spacing.xl, marginBottom: spacing.base, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FDEDEC', flexDirection: 'row', gap: spacing.sm }, errorText: { flex: 1, color: colors.status.REJECTED, fontSize: typography.sizes.sm },
  addressCard: { marginHorizontal: spacing.xl, marginTop: spacing.base, padding: spacing.base, borderRadius: radius.xl, backgroundColor: colors.surface.card, flexDirection: 'row', gap: spacing.md }, addressText: { flex: 1 }, addressLabel: { fontWeight: typography.weights.bold, color: colors.text.primary }, address: { marginTop: spacing.xs, color: colors.text.secondary, lineHeight: 20 }, coordinates: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: colors.text.secondary },
  confirmButton: { marginHorizontal: spacing.xl, marginTop: spacing.xl, height: 48, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }, confirmText: { color: colors.text.inverse, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }, disabled: { opacity: 0.5 }, backText: { marginTop: spacing.base, textAlign: 'center', color: colors.brand.primary, fontWeight: typography.weights.semibold }, mineLink: { marginTop: spacing.base, textAlign: 'center', color: colors.brand.accent, fontWeight: typography.weights.bold },
});
