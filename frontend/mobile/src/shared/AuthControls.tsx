import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "./theme";
import { Ionicons } from "@expo/vector-icons";

export function Brand() {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 }}>
    <View style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 16 }}>
      <Ionicons name="location-outline" size={28} color="white" />
    </View>
    <Text accessibilityRole="header" style={[styles.brand, { marginBottom: 0 }]}>InfraMap</Text>
  </View>;
}

export function Button({ title, onPress, outline = false, disabled = false }: {
  title: string; onPress: () => void; outline?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [
        styles.button, outline && styles.outline, (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, outline && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, password = false, ...props }: TextInputProps & {
  label: string; password?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput {...props} accessibilityLabel={label} secureTextEntry={password && !visible}
          autoCapitalize={props.autoCapitalize ?? "none"} style={styles.input}
          placeholderTextColor="#737D8C" />
        {password && <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)}
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"} style={styles.visibility}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.secondary} />
        </Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.primary, fontWeight: "800", fontSize: 32, marginBottom: 28 },
  button: { backgroundColor: colors.primary, minHeight: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center", padding: 12, borderWidth: 1, borderColor: colors.primary },
  outline: { backgroundColor: colors.surface },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "700" },
  field: { gap: 8, marginBottom: 20 },
  label: { color: colors.text, fontWeight: "600", fontSize: 14 },
  inputRow: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderRadius: 12, minHeight: 48 },
  input: { flex: 1, padding: 14, fontSize: 16, color: colors.text },
  visibility: { justifyContent: "center", paddingHorizontal: 12, minHeight: 48 },
});
