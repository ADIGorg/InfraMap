import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../shared/AuthControls";
import { Feedback, Header, Page, ui } from "../../shared/ui";
import { useNotificationsViewModel } from "./useNotificationsViewModel";
export function NotificationsScreen({ open }: { open: (id: string) => void }) {
  const vm = useNotificationsViewModel();
  return <View style={ui.root}><Header title="Notificações" /><Page>
    <Text style={ui.body}>Acompanhe as atualizações das suas ocorrências.</Text>
    <Feedback {...vm} retry={vm.reload} />
    {!!vm.message && <Text accessibilityRole="alert" style={ui.error}>{vm.message}</Text>}
    {vm.data?.data.length === 0 && <Text style={ui.body}>Você está em dia. Nenhuma notificação por aqui.</Text>}
    {!!vm.data?.data.length && <Button title="Marcar todas como lidas" outline disabled={vm.busy} onPress={() => vm.markRead()} />}
    {vm.data?.data.map((item) => <Pressable key={item.id} accessibilityRole="button" disabled={vm.busy}
      accessibilityLabel={`${item.read_at ? "" : "Não lida. "}${item.title}. ${item.message}`}
      style={[ui.card, { backgroundColor: item.read_at ? "#F5F7FA" : "white" }]}
      onPress={async () => {
        const success = item.read_at || await vm.markRead(item.id);
        if (success && item.occurrence_id) open(item.occurrence_id);
      }}>
      <View style={ui.row}><Ionicons name="notifications-outline" size={22} color="#1A5276" />
        <Text style={ui.title}>{item.title}</Text></View>
      <Text style={ui.body}>{item.message}</Text>
      <Text style={ui.muted}>{new Date(item.created_at).toLocaleString("pt-BR")}</Text>
    </Pressable>)}
    {vm.page > 1 && <Button title="Anterior" outline onPress={() => vm.setPage(vm.page - 1)} />}
    {vm.page < (vm.data?.pagination.total_pages ?? 0) && <Button title="Próxima página" outline onPress={() => vm.setPage(vm.page + 1)} />}
  </Page></View>;
}
