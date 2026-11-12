import { Image, Pressable, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Button } from "../../shared/AuthControls";
import { Feedback, Header, Page, StatusBadge, ui } from "../../shared/ui";
import { useMyOccurrencesViewModel, useOccurrenceViewModel } from "./useOccurrencesViewModel";
import type { Occurrence } from "./occurrencesApi";

export function MyOccurrencesScreen({ open }: { open: (id: string) => void }) {
  const vm = useMyOccurrencesViewModel();
  return <View style={ui.root}><Header title="Minhas ocorrências" /><Page>
    <Text style={ui.body}>Acompanhe o andamento dos seus relatos</Text>
    <Feedback {...vm} retry={vm.reload} />
    {!vm.loading && !vm.error && vm.data?.data.length === 0 && <Text style={ui.body}>Você ainda não registrou ocorrências.</Text>}
    {vm.data?.data.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => open(item.id)} style={ui.card}>
      <Text style={ui.title}>{item.category.name}</Text><StatusBadge status={item.status} />
      <Text style={ui.muted}>Criado em {new Date(item.createdAt).toLocaleDateString("pt-BR")}</Text>
      <Text numberOfLines={3} style={ui.body}>{item.description}</Text>
    </Pressable>)}
    <View style={ui.row}>
      {vm.page > 1 && <Button title="Anterior" outline onPress={() => vm.setPage(vm.page - 1)} />}
      {vm.page < (vm.data?.pagination.totalPages ?? 0) && <Button title="Próxima página" onPress={() => vm.setPage(vm.page + 1)} />}
    </View>
  </Page></View>;
}

export function LocationPreview({ occurrence }: { occurrence: Occurrence }) {
  const coordinate = { latitude: occurrence.location.lat, longitude: occurrence.location.lng };
  return <MapView style={{ height: 180, borderRadius: 16 }} initialRegion={{ ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 }}>
    <Marker coordinate={coordinate} title="Localização aproximada" />
  </MapView>;
}

export function OccurrenceScreen({ id, own, back, signedIn, login }: {
  id: string; own: boolean; back: () => void; signedIn: boolean; login: () => void;
}) {
  const vm = useOccurrenceViewModel(id, own);
  const item = vm.data?.occurrence;
  return <View style={ui.root}><Header title="Detalhes da ocorrência" back={back} /><Page>
    <Feedback {...vm} retry={vm.reload} />
    {item && <>
      <Text style={ui.title}>{item.category.name}</Text><StatusBadge status={item.status} />
      <Text style={ui.title}>Descrição</Text><Text style={ui.body}>{item.description}</Text>
      <View style={ui.card}><Text style={ui.body}>Data de registro</Text>
        <Text style={ui.title}>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</Text></View>
      <Text style={ui.title}>{own ? "Localização" : "Localização aproximada"}</Text>
      <LocationPreview occurrence={item} />
      {!!item.photoUrls?.length && <><Text style={ui.title}>Evidências enviadas</Text>
        <View style={ui.row}>{item.photoUrls.map((photo) => <Image key={photo.position}
          accessibilityLabel={`Foto ${photo.position} da ocorrência`} source={{ uri: photo.url }}
          style={{ width: 100, height: 110, borderRadius: 10 }} />)}</View>
        <Button title="Atualizar fotos" outline onPress={vm.reload} /></>}
      {own ? <View style={ui.card}><Text style={ui.title}>Histórico da ocorrência</Text>
        {!!vm.data?.historyError && <><Text accessibilityRole="alert" style={ui.error}>{vm.data.historyError}</Text>
          <Button title="Recarregar histórico" outline onPress={vm.reload} /></>}
        {vm.data?.history.map((event) => <View key={event.id} style={{ borderLeftWidth: 2, borderLeftColor: "#48C9B0", paddingLeft: 12, gap: 6 }}>
          {event.newData?.status ? <StatusBadge status={event.newData.status} /> : <Text style={ui.body}>{event.content ?? "Atualização da ocorrência"}</Text>}
          <Text style={ui.muted}>{new Date(event.createdAt).toLocaleString("pt-BR")}</Text>
        </View>)}
        {!vm.data?.historyError && vm.data?.history.length === 0 && <Text style={ui.body}>O histórico será exibido aqui.</Text>}
      </View> : <View style={ui.card}><Text style={[ui.title, { fontSize: 32 }]}>{item.votesCount}</Text>
        <Text style={ui.body}>Votos de impacto comunitário</Text>
        <Button title="Votar" disabled={vm.busy} onPress={signedIn ? () => vm.changeVote(false) : login} />
        {signedIn && <Button title="Retirar meu voto" outline disabled={vm.busy} onPress={() => vm.changeVote(true)} />}
        {!!vm.feedback && <Text accessibilityLiveRegion="polite" style={ui.body}>{vm.feedback}</Text>}
      </View>}
    </>}
  </Page></View>;
}
