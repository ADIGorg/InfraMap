import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AccountProfile } from '@/shared/types/api';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  visible: boolean;
  profile: AccountProfile | null;
  name: string;
  phone: string;
  errors: { name?: string; phone?: string; general?: string };
  isSaving: boolean;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onClearError: (field: 'name' | 'phone') => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EditProfileModal({
  visible,
  profile,
  name,
  phone,
  errors,
  isSaving,
  onChangeName,
  onChangePhone,
  onClearError,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Editar perfil</Text>
            <TouchableOpacity onPress={onCancel} disabled={isSaving} accessibilityLabel="Fechar">
              <Feather name="x" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={(v) => {
              onChangeName(v);
              onClearError('name');
            }}
            placeholder="Seu nome"
            accessibilityLabel="Campo de nome completo"
            editable={!isSaving}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>E-mail</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{profile?.email ?? '—'}</Text>
          </View>
          <Text style={styles.hint}>Não editável no MVP</Text>

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={(v) => {
              onChangePhone(v);
              onClearError('phone');
            }}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            accessibilityLabel="Campo de telefone"
            editable={!isSaving}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          <Text style={styles.hint}>Deixe em branco para remover</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
              disabled={isSaving}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.disabled]}
              onPress={onSubmit}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Salvar alterações"
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: 48,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.status.REJECTED },
  readonlyField: {
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  readonlyText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.status.REJECTED,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#FDEDEC',
    borderLeftWidth: 4,
    borderLeftColor: colors.status.REJECTED,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    color: colors.status.REJECTED,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    height: 44,
    minWidth: 100,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.6 },
});