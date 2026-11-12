import { ActivityIndicator, Alert, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { MapScreen } from "../features/map/MapScreen";
import { MyOccurrencesScreen, OccurrenceScreen } from "../features/occurrences/OccurrencesScreens";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { ReportScreen } from "../features/occurrence-report/ReportScreen";
import { ui } from "../shared/ui";
import { useAppViewModel, type Tab } from "./useAppViewModel";

const tabs: { id: Tab; label: string; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "map", label: "Mapa", icon: "map-outline" },
  { id: "mine", label: "Minhas ocorrências", icon: "document-text-outline" },
  { id: "report", label: "Nova ocorrência", icon: "add" },
  { id: "profile", label: "Perfil", icon: "person-outline" },
  { id: "notifications", label: "Alertas", icon: "notifications-outline" },
];
function Navigator() {
  const vm = useAppViewModel();
  if (!vm.ready) return <ActivityIndicator accessibilityLabel="Restaurando sessão" style={{ flex: 1 }} />;
  if (vm.access) return <AuthScreen browse={vm.browse} />;
  const ownDetail = (id: string) => vm.setDetail({ id, own: true });
  if (vm.tab === "report" && vm.session) return <ReportScreen
    close={() => Alert.alert("Sair do registro?", "Os dados deste registro serão descartados.",
      [{ text: "Continuar", style: "cancel" }, { text: "Sair", style: "destructive", onPress: vm.browse }])}
    mine={() => vm.select("mine")} map={vm.browse} />;
  let content;
  if (vm.detail) content = <OccurrenceScreen {...vm.detail} signedIn={!!vm.session}
    login={vm.login} back={() => vm.setDetail(undefined)} />;
  else if (vm.tab === "mine") content = <MyOccurrencesScreen open={ownDetail} />;
  else if (vm.tab === "profile") content = <ProfileScreen />;
  else if (vm.tab === "notifications") content = <NotificationsScreen open={ownDetail} />;
  else content = <MapScreen open={(id) => vm.setDetail({ id, own: false })} />;
  return <View style={ui.root}>{content}
    <View style={{ flexDirection: "row", backgroundColor: "white", paddingTop: 8, borderTopWidth: 1, borderColor: "#E5E7EB" }}>
      {tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="tab"
        accessibilityLabel={tab.label} accessibilityState={{ selected: vm.tab === tab.id }}
        onPress={() => vm.select(tab.id)} style={{ flex: 1, alignItems: "center", minHeight: 62, paddingHorizontal: 2 }}>
        <View style={tab.id === "report" ? { backgroundColor: "#1A5276", padding: 12, borderRadius: 30, marginTop: -26 } : undefined}>
          <Ionicons name={tab.icon} size={tab.id === "report" ? 30 : 24}
            color={tab.id === "report" ? "white" : vm.tab === tab.id ? "#1A5276" : "#687385"} />
        </View>
        <Text style={{ fontSize: 11, color: vm.tab === tab.id ? "#1A5276" : "#687385", textAlign: "center", marginTop: 4 }}>{tab.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
export function App() {
  return <SafeAreaProvider><SafeAreaView style={ui.root}>
    <StatusBar barStyle="dark-content" /><Navigator />
  </SafeAreaView></SafeAreaProvider>;
}
