import { useCallback, useState } from "react";
import { useResource } from "../../shared/useResource";
import { listNotifications, readAll, readNotification } from "./notificationsApi";
export function useNotificationsViewModel() {
  const [page, setPage] = useState(1);
  const resource = useResource(useCallback(() => listNotifications(page), [page]));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function markRead(id?: string) {
    if (busy) return false;
    setBusy(true);
    setMessage("");
    try { if (id) await readNotification(id); else await readAll(); await resource.reload(); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "Tente novamente."); return false; }
    finally { setBusy(false); }
  }
  return { ...resource, page, setPage, markRead, message, busy };
}
