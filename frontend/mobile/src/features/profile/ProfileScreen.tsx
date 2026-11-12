import { Alert, Text, View } from "react-native";
import { Button, Field } from "../../shared/AuthControls";
import { Feedback, Header, Page, ui } from "../../shared/ui";
import { useProfileViewModel } from "./useProfileViewModel";
export function ProfileScreen() {
  const vm = useProfileViewModel();
  const profile = vm.data?.data;
  return <View style={ui.root}><Header title="Meu perfil" /><Page>
    <Feedback {...vm} retry={vm.reload} />
    {profile && <>
      <View style={[ui.card, { alignItems: "center", backgroundColor: "#1A5276", padding: 28 }]}>
        <Text style={{ backgroundColor: "#48C9B0", color: "white", padding: 20, borderRadius: 50, fontSize: 28, fontWeight: "700" }}>
          {profile.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}
        </Text>
        <Text style={[ui.title, { color: "white" }]}>{profile.name}</Text>
        <Text style={{ color: "white" }}>{profile.email}</Text>
      </View>
      {vm.editing ? <View style={ui.card}>
        <Field label="Nome completo" value={vm.name} onChangeText={vm.setName} autoCapitalize="words" editable={!vm.busy} />
        <Field label="Telefone" value={vm.phone} onChangeText={vm.setPhone} keyboardType="phone-pad" editable={!vm.busy} />
        <Button title="Salvar" disabled={vm.busy} onPress={() => vm.perform("save")} />
        <Button title="Cancelar" outline disabled={vm.busy} onPress={() => vm.setEditing(false)} />
      </View> : <Button title="Editar nome e telefone" outline onPress={vm.edit} />}
      {vm.passwordEditing ? <View style={ui.card}>
        <Field label="Nova senha" password value={vm.password} onChangeText={vm.setPassword} editable={!vm.busy} />
        <Field label="Confirmar nova senha" password value={vm.confirmation} onChangeText={vm.setConfirmation} editable={!vm.busy} />
        <Button title="Salvar senha" disabled={vm.busy} onPress={() => vm.perform("password")} />
        <Button title="Cancelar" outline disabled={vm.busy} onPress={() => {
          vm.setPasswordEditing(false); vm.setPassword(""); vm.setConfirmation("");
        }} />
      </View> : <Button title="Alterar senha" outline onPress={() => vm.setPasswordEditing(true)} />}
      <Button title="Excluir conta" outline disabled={vm.busy} onPress={() => Alert.alert(
        "Desativar sua conta?", "Seus dados de contato serão anonimizados. Ocorrências e histórico serão preservados. Esta ação é irreversível.",
        [{ text: "Cancelar", style: "cancel" }, { text: "Desativar conta", style: "destructive", onPress: () => { void vm.perform("delete"); } }],
      )} />
      <Button title="Sair da conta" outline disabled={vm.busy} onPress={() => vm.perform("logout")} />
      {!!vm.message && <Text accessibilityLiveRegion="polite" style={ui.body}>{vm.message}</Text>}
    </>}
  </Page></View>;
}
