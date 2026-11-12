import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { colors } from "./theme";
import { Button } from "./AuthControls";

export function Header({ title, back, inverse = false }: { title: string; back?: () => void; inverse?: boolean }) {
  return <View style={[ui.header, inverse && { backgroundColor: colors.primary }]}>
    <View style={ui.row}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} style={ui.iconButton}>
        <Ionicons name="arrow-back" size={24} color={inverse ? "white" : colors.primary} />
      </Pressable>}
      <Ionicons name="location-outline" size={28} color={inverse ? "white" : colors.primary} />
      <Text style={[ui.brand, inverse && { color: "white" }]}>InfraMap</Text>
    </View>
    <Text accessibilityRole="header" style={[ui.heading, inverse && { color: "white" }]}>{title}</Text>
  </View>;
}
export function Page({ children }: { children: ReactNode }) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.page}>{children}</ScrollView>;
}
export function Feedback({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <ActivityIndicator accessibilityLabel="Carregando" size="large" color={colors.primary} style={{ margin: 24 }} />;
  if (error) return <View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{error}</Text>
    <Button title="Tentar novamente" onPress={retry} /></View>;
  return null;
}
const statuses: Record<string, [string, string, string]> = {
  RECEIVED: ["Recebido", "#4B5563", "#E5E7EB"],
  UNDER_ANALYSIS: ["Em análise", "#6D28D9", "#EDE9FE"],
  CONFIRMED: ["Confirmado", "#166534", "#EAFAF1"],
  IN_SERVICE: ["Em atendimento", "#92400E", "#FEF5E7"],
  RESOLVED: ["Resolvido", "#1A5276", "#EBF5FB"],
  REJECTED: ["Rejeitado", "#B42318", "#FEE4E2"],
};
export function StatusBadge({ status }: { status: string }) {
  const [label, color, backgroundColor] = statuses[status] ?? [status, colors.text, colors.border];
  return <Text style={[ui.badge, { color, backgroundColor }]}>{label}</Text>;
}
export const ui = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  page: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { padding: 20, gap: 16, backgroundColor: colors.surface },
  brand: { fontSize: 26, fontWeight: "800", color: colors.primary },
  heading: { fontSize: 24, fontWeight: "600", color: colors.primary },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.secondary },
  muted: { fontSize: 13, color: "#687385", lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: colors.border },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, lineHeight: 22 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
