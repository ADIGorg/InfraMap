import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export function TermsModal({ visible, onClose, initialTab = 'terms' }: TermsModalProps) {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Documentos legais</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'terms' && styles.tabActive]}
              onPress={() => setTab('terms')}
            >
              <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>
                Termos de Uso
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'privacy' && styles.tabActive]}
              onPress={() => setTab('privacy')}
            >
              <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
                Privacidade
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.bodyText}>
              {tab === 'terms'
                ? 'Ao utilizar o InfraMap, você concorda em fornecer informações precisas sobre problemas de infraestrutura urbana e permite que suas fotografias sejam exibidas no mapa público (exceto quando você optar por mantê-las privadas).\n\nEste é um texto de placeholder para o MVP. A versão final deve ser revisada pelo jurídico.'
                : 'Coletamos seu nome, e-mail e telefone para permitir o registro e acompanhamento de ocorrências. Suas fotografias serão exibidas publicamente apenas com seu consentimento explícito.\n\nEste é um texto de placeholder para o MVP. A versão final deve ser revisada pelo jurídico.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '80%', paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary },
  closeText: { color: colors.brand.primary, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  tabs: { flexDirection: 'row', padding: spacing.base, gap: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.surface.page },
  tabActive: { backgroundColor: colors.brand.primary },
  tabText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  tabTextActive: { color: colors.text.inverse },
  body: { paddingHorizontal: spacing.base, maxHeight: 400 },
  bodyText: { fontSize: typography.sizes.base, color: colors.text.primary, lineHeight: 22 },
});