import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { listPublic, type Occurrence } from "../occurrences/occurrencesApi";
import { useResource } from "../../shared/useResource";
export function useMapViewModel() {
  const [page, setPage] = useState(1);
  const resource = useResource(useCallback(() => listPublic(page), [page]));
  const [selected, setSelected] = useState<Occurrence>();
  const [message, setMessage] = useState("");
  async function locate() {
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setMessage("Permita o acesso à localização para centralizar o mapa."); return; }
      return (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
    } catch { setMessage("Não foi possível obter sua localização. Tente novamente."); }
  }
  return { ...resource, page, setPage, selected, setSelected, locate, message };
}
