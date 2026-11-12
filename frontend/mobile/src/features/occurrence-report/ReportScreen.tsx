import { useEffect } from "react";
import { ActivityIndicator, BackHandler, Image, Pressable, Text, TextInput, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../shared/AuthControls";
import { Feedback, Header, Page, StatusBadge, ui } from "../../shared/ui";
import { useReportViewModel } from "./useReportViewModel";
export function ReportScreen({ close, mine, map }: { close: () => void; mine: () => void; map: () => void }) {
  const vm = useReportViewModel();
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (vm.busy) return true;
      if (vm.result) map();
      else if (vm.step > 1) vm.setStep(vm.step - 1);
      else close();
      return true;
    });
    return () => subscription.remove();
  }, [vm.step, vm.busy, vm.result, close, map]);
  if (vm.result) return <View style={ui.root}><Header title="Nova ocorrência" inverse /><Page>
    <View style={{ alignItems: "center", paddingVertical: 32, gap: 20 }}>
      <Ionicons name="checkmark-circle-outline" size={100} color="#48C9B0" />
      <Text style={ui.title}>Ocorrência enviada!</Text>
      <Text style={ui.body}>Sua ocorrência foi registrada e será analisada pela equipe responsável.</Text>
    </View>
    <View style={ui.card}><Text style={ui.body}>Identificador do registro</Text>
      <Text selectable style={ui.body}>{vm.result.id}</Text><StatusBadge status={vm.result.status} /></View>
    <Button title="Ver minhas ocorrências" onPress={mine} /><Button title="Voltar ao mapa" outline onPress={map} />
  </Page></View>;
  return <View style={ui.root}><Header title="Nova ocorrência" inverse back={vm.busy ? undefined : close} />
    <View style={[ui.row, { justifyContent: "space-around", padding: 12, backgroundColor: "white" }]}>
      {["Foto", "Análise IA", "Revisão", "Localização"].map((label, index) => <View key={label} style={{ alignItems: "center", gap: 5 }}>
        <Text style={{ backgroundColor: index + 1 === vm.step ? "#48C9B0" : index + 1 < vm.step ? "#1A5276" : "#D9D9D9",
          color: index + 1 <= vm.step ? "white" : "#1F2937", padding: 12, borderRadius: 24 }}>{index + 1}</Text>
        <Text style={ui.muted}>{label}</Text>
      </View>)}
    </View>
    <Page>
      <Feedback loading={vm.categories.loading} error={vm.categories.error} retry={vm.categories.reload} />
      {vm.step === 1 && <>
        <Text style={ui.title}>Evidência fotográfica</Text><Text style={ui.body}>Tire de 1 a 3 fotos JPEG ou PNG de até 5 MB cada.</Text>
        <Button title="Tirar foto" onPress={vm.capture} disabled={vm.busy || vm.photos.length === 3} />
        <View style={ui.row}>{vm.photos.map((photo, index) => <View key={photo.uri}>
          <Image source={{ uri: photo.uri }} accessibilityLabel={`Foto ${index + 1}`} style={{ width: 96, height: 110, borderRadius: 12 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover foto ${index + 1}`} disabled={vm.busy}
            onPress={() => vm.removePhoto(index)} style={ui.iconButton}><Ionicons name="trash-outline" size={22} color="#B42318" /></Pressable>
        </View>)}</View><Text style={ui.body}>{vm.photos.length} / 3 fotos</Text>
      </>}
      {vm.step === 2 && <>
        <Text style={ui.title}>Análise da IA</Text>
        {vm.analysis?.status === "COMPLETED" ? <>
          <Text style={ui.body}>Revise as sugestões antes de confirmar.</Text>
          <Text style={ui.muted}>Confiança da sugestão {Math.round((vm.analysis.confidence ?? 0) * 100)}%</Text>
          <View style={ui.card}><Text style={ui.title}>Categoria</Text>
            {vm.categories.data?.data.map((category) => <Pressable key={category.id} accessibilityRole="radio"
              accessibilityState={{ checked: vm.categoryId === category.id }} onPress={() => vm.setCategoryId(category.id)}
              style={[ui.row, { minHeight: 44 }]}>
              <Ionicons name={vm.categoryId === category.id ? "radio-button-on" : "radio-button-off"} size={22} color="#1A5276" />
              <Text style={[ui.body, { flex: 1 }]}>{category.name}</Text>
            </Pressable>)}
          </View>
          <View style={ui.card}><Text style={ui.title}>Descrição</Text>
            <TextInput accessibilityLabel="Descrição da ocorrência" multiline maxLength={500}
              value={vm.description} onChangeText={vm.setDescription}
              style={[ui.body, { minHeight: 130, textAlignVertical: "top" }]} />
            <Text style={ui.muted}>{vm.description.length}/500</Text></View>
        </> : vm.analysis?.status === "FAILED" || vm.analysis?.status === "PENDING" ? <>
          <Text style={ui.body}>A análise falhou. Suas fotos estão disponíveis para uma nova tentativa.</Text>
          <Button title="Analisar novamente" disabled={vm.busy} onPress={vm.startAnalysis} />
        </> : <>
          <ActivityIndicator color="#1A5276" /><Text style={ui.body}>Analisando suas fotos…</Text>
          <Button title="Consultar análise" outline onPress={vm.retryPoll} />
        </>}
      </>}
      {vm.step === 3 && <>
        <Text style={ui.title}>Revisão da ocorrência</Text><Text style={ui.body}>Confira tudo antes de ir para a localização.</Text>
        <View style={ui.card}><Text style={ui.title}>Fotos</Text><View style={ui.row}>
          {vm.photos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={{ width: 88, height: 100, borderRadius: 10 }} />)}
        </View><Button title="Editar fotos" outline onPress={() => vm.setStep(1)} /></View>
        <View style={ui.card}><Text style={ui.title}>{vm.categories.data?.data.find((item) => item.id === vm.categoryId)?.name}</Text>
          <Text style={ui.body}>{vm.description}</Text><Button title="Editar informações" outline onPress={() => vm.setStep(2)} /></View>
      </>}
      {vm.step === 4 && <>
        <Text style={ui.title}>Localização do problema</Text>
        <Text style={ui.body}>Use o GPS ou toque no mapa para escolher o ponto.</Text>
        <Button title="Usar minha localização (GPS)" onPress={vm.locate} disabled={vm.busy} />
        <MapView style={{ height: 260, borderRadius: 16 }}
          region={vm.location ? { latitude: vm.location.lat, longitude: vm.location.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
          initialRegion={{ latitude: -14.2, longitude: -51.9, latitudeDelta: 40, longitudeDelta: 40 }}
          onPress={(event) => vm.setLocation({ lat: event.nativeEvent.coordinate.latitude, lng: event.nativeEvent.coordinate.longitude })}>
          {vm.location && <Marker draggable coordinate={{ latitude: vm.location.lat, longitude: vm.location.lng }}
            onDragEnd={(event) => vm.setLocation({ lat: event.nativeEvent.coordinate.latitude, lng: event.nativeEvent.coordinate.longitude })} />}
        </MapView>
        {vm.location && <Text style={ui.muted}>Ponto selecionado · {vm.location.lat.toFixed(5)}, {vm.location.lng.toFixed(5)}</Text>}
      </>}
      {!!vm.error && <Text accessibilityRole="alert" style={ui.error}>{vm.error}</Text>}
      {vm.uncertain ? <Button title="Ver minhas ocorrências" onPress={mine} /> : vm.step === 4 ?
        <Button title={vm.busy ? "Enviando…" : "Enviar ocorrência"} onPress={vm.send} disabled={vm.busy || !vm.location} /> :
        <Button title={vm.busy ? "Aguarde…" : "Próximo"} onPress={vm.next}
          disabled={vm.busy || (vm.step === 2 && vm.analysis?.status !== "COMPLETED")} />}
      {vm.step > 1 && <Button title="Voltar" outline disabled={vm.busy} onPress={() => vm.setStep(vm.step - 1)} />}
    </Page>
  </View>;
}
