import { useEffect } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Brand, Button, Field } from "../../shared/AuthControls";
import { colors } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuthViewModel } from "./useAuthViewModel";

export function AuthScreen({ browse }: { browse: () => void }) {
  const vm = useAuthViewModel();
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (vm.screen === "welcome") return false;
      vm.navigate("welcome");
      return true;
    });
    return () => subscription.remove();
  }, [vm.screen, vm.busy]);

  const registering = vm.screen === "register";
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <Brand />
        {vm.screen === "welcome" ? <>
          <Text style={styles.title}>Sua cidade melhor, com a sua participação</Text>
          <Text style={styles.intro}>Registre problemas de infraestrutura com foto e localização e acompanhe cada atualização.</Text>
          <View style={styles.features}>
            {(["Veja as ocorrências perto de você no mapa", "Envie fotos para registrar um problema", "Acompanhe o status até a solução"]).map((text, index) =>
              <View key={text} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
                <View style={{ borderRadius: 24, backgroundColor: colors.primary, padding: 10 }}>
                  <Ionicons name={index === 0 ? "location-outline" : index === 1 ? "camera-outline" : "shield-checkmark-outline"} size={20} color="white" />
                </View>
                <Text style={[styles.cardText, { flex: 1 }]}>{text}</Text>
              </View>)}
          </View>
          <View style={styles.actions}>
            <Button title="Entrar" onPress={() => vm.navigate("login")} />
            <Button title="Criar conta" outline onPress={() => vm.navigate("register")} />
            <Button title="Explorar o mapa" outline onPress={browse} />
          </View>
        </> : vm.screen === "recover" ? <>
          <Text style={styles.title}>Esqueci minha senha</Text>
          <Text style={styles.description}>Informe o e-mail da sua conta para receber as instruções de recuperação.</Text>
          <Field label="E-mail" value={vm.email} onChangeText={vm.setEmail} keyboardType="email-address" editable={!vm.busy} />
          {!!vm.error && <Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text>}
          {!!vm.message && <Text accessibilityLiveRegion="polite" style={styles.description}>{vm.message}</Text>}
          <Button title={vm.busy ? "Enviando…" : "Enviar link de recuperação"} onPress={vm.submit} disabled={vm.busy} />
          <Pressable style={styles.back} onPress={() => vm.navigate("login")} accessibilityRole="button">
            <Text style={styles.tabText}>Voltar para entrar</Text>
          </Pressable>
        </> : <>
          <View style={styles.tabs}>
            {(["login", "register"] as const).map((tab) =>
              <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: vm.screen === tab }}
                disabled={vm.busy} onPress={() => vm.navigate(tab)}
                style={[styles.tab, vm.screen === tab && styles.activeTab]}>
                <Text style={[styles.tabText, vm.screen === tab && styles.activeText]}>
                  {tab === "login" ? "Entrar" : "Criar conta"}
                </Text>
              </Pressable>)}
          </View>
          <Text style={styles.description}>{registering ? "Crie sua conta para registrar ocorrências." : "Bem-vindo de volta! Acesse sua conta."}</Text>
          {registering && <Field label="Nome completo" placeholder="Digite seu nome completo"
            value={vm.name} onChangeText={vm.setName} autoCapitalize="words" editable={!vm.busy} />}
          <Field label="E-mail" placeholder="exemplo@email.com" keyboardType="email-address"
            autoComplete="email" value={vm.email} onChangeText={vm.setEmail} editable={!vm.busy} />
          <Field label="Senha" placeholder={registering ? "Crie sua senha" : "Digite sua senha"}
            password value={vm.password} onChangeText={vm.setPassword} editable={!vm.busy} />
          {registering && <Field label="Confirmar senha" placeholder="Digite a senha novamente"
            password value={vm.confirmation} onChangeText={vm.setConfirmation} editable={!vm.busy} />}
          {!!vm.error && <Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text>}
          {!!vm.message && <Text accessibilityLiveRegion="polite" style={styles.description}>{vm.message}</Text>}
          <Button title={vm.busy ? "Aguarde…" : registering ? "Criar conta" : "Entrar"}
            disabled={vm.busy} onPress={vm.submit} />
          {!registering && <Pressable style={styles.back} disabled={vm.busy} onPress={() => vm.navigate("recover")} accessibilityRole="button">
            <Text style={styles.tabText}>Esqueci minha senha</Text>
          </Pressable>}
          <Pressable accessibilityRole="button" disabled={vm.busy} style={styles.back} onPress={() => vm.navigate("welcome")}>
            <Text style={styles.tabText}>Voltar ao início</Text>
          </Pressable>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, paddingTop: 48, paddingBottom: 28, width: "100%", maxWidth: 520, alignSelf: "center" },
  title: { fontSize: 32, fontWeight: "800", color: colors.primary, marginBottom: 12 },
  intro: { fontSize: 16, color: colors.secondary, lineHeight: 23 },
  features: { gap: 16, marginTop: 36, marginBottom: 32 },
  card: { minHeight: 60, justifyContent: "center", padding: 18, backgroundColor: colors.surface, borderRadius: 14, elevation: 2 },
  cardText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  actions: { marginTop: "auto", gap: 12 },
  tabs: { flexDirection: "row", padding: 6, borderRadius: 20, backgroundColor: colors.surface, elevation: 2 },
  tab: { flex: 1, padding: 12, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  activeText: { color: colors.surface },
  description: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginVertical: 24 },
  error: { color: colors.danger, marginBottom: 16, lineHeight: 21 },
  back: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16 },
});
