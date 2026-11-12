import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../shared/AuthControls";
import { Feedback, Header, ui } from "../../shared/ui";
import { useMapViewModel } from "./useMapViewModel";
export function MapScreen({ open }: { open: (id: string) => void }) {
  const vm = useMapViewModel();
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (mapReady && vm.data?.data.length) map.current?.fitToCoordinates(vm.data.data.map((item) => ({
      latitude: item.location.lat, longitude: item.location.lng,
    })), { edgePadding: { top: 40, bottom: 40, left: 40, right: 40 }, animated: true });
  }, [mapReady, vm.data]);
  return <View style={ui.root}><Header title="Mapa de ocorrências" />
    <Feedback {...vm} retry={vm.reload} />
    {!!vm.message && <Text accessibilityRole="alert" style={{ padding: 12 }}>{vm.message}</Text>}
    <MapView ref={map} style={{ flex: 1 }}
      initialRegion={{ latitude: -14.2, longitude: -51.9, latitudeDelta: 40, longitudeDelta: 40 }}
      onMapReady={() => setMapReady(true)}>
      {vm.data?.data.map((item) => <Marker key={item.id}
        coordinate={{ latitude: item.location.lat, longitude: item.location.lng }}
        title={item.category.name} onPress={() => vm.setSelected(item)} />)}
    </MapView>
    {!vm.loading && vm.data?.data.length === 0 && <Text style={{ padding: 16 }}>Nenhuma ocorrência pública nesta página.</Text>}
    <View style={[ui.row, { padding: 12 }]}>
      {vm.page > 1 && <Button title="Anterior" outline onPress={() => vm.setPage(vm.page - 1)} />}
      {vm.page < (vm.data?.pagination.totalPages ?? 0) && <Button title="Mais ocorrências" outline onPress={() => vm.setPage(vm.page + 1)} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Centralizar na minha localização"
        style={ui.iconButton} onPress={async () => {
          const coords = await vm.locate();
          if (coords) map.current?.animateToRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 });
        }}><Ionicons name="navigate-circle" size={44} color="#1A5276" /></Pressable>
    </View>
    <Modal visible={!!vm.selected} transparent animationType="slide" onRequestClose={() => vm.setSelected(undefined)}>
      <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} accessibilityLabel="Fechar prévia" onPress={() => vm.setSelected(undefined)} />
        <View style={[ui.card, { padding: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={ui.title}>{vm.selected?.category.name}</Text>
          <Text numberOfLines={4} style={ui.body}>{vm.selected?.description}</Text>
          <Text style={ui.muted}>Localização aproximada para preservar a privacidade.</Text>
          <Button title="Ver detalhes" onPress={() => {
            if (vm.selected) open(vm.selected.id);
            vm.setSelected(undefined);
          }} />
          <Button title="Fechar" outline onPress={() => vm.setSelected(undefined)} />
        </View>
      </View>
    </Modal>
  </View>;
}
