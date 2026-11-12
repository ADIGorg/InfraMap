import { useCallback, useState } from "react";
import { useResource } from "../../shared/useResource";
import { getHistory, getOccurrence, listMine, vote } from "./occurrencesApi";

export function useMyOccurrencesViewModel() {
  const [page, setPage] = useState(1);
  const resource = useResource(useCallback(() => listMine(page), [page]));
  return { ...resource, page, setPage };
}
export function useOccurrenceViewModel(id: string, own: boolean) {
  const resource = useResource(useCallback(async () => {
    const detail = await getOccurrence(id, own);
    try {
      const history = own ? await getHistory(id) : { data: [] };
      return { occurrence: detail.data, history: history.data, historyError: "" };
    } catch (failure) {
      return { occurrence: detail.data, history: [], historyError: failure instanceof Error ? failure.message : "Histórico indisponível." };
    }
  }, [id, own]));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function changeVote(remove: boolean) {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    try { await vote(id, remove); await resource.reload(); setFeedback(remove ? "Voto retirado." : "Voto registrado."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  return { ...resource, busy, feedback, changeVote };
}
