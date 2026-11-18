import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, radius } from '@/shared/theme';

interface AuthToggleProps {
  activeTab: 'login' | 'register';
  onChange: (tab: 'login' | 'register') => void;
}

export function AuthToggle({ activeTab, onChange }: AuthToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.segment, activeTab === 'login' && styles.segmentActive]}
        onPress={() => onChange('login')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'login' }}
      >
        <Text style={[styles.segmentText, activeTab === 'login' && styles.segmentTextActive]}>
          Entrar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, activeTab === 'register' && styles.segmentActive]}
        onPress={() => onChange('register')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'register' }}
      >
        <Text style={[styles.segmentText, activeTab === 'register' && styles.segmentTextActive]}>
          Criar conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segment: {
    flex: 1,
    height: 41,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.brand.primary },
  segmentText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  segmentTextActive: { color: colors.text.inverse },
});