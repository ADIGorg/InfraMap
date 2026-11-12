import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { restoreSession, useSession } from "../shared/http";
export type Tab = "map" | "mine" | "report" | "profile" | "notifications";
export function useAppViewModel() {
  const { session, ready } = useSession();
  const [tab, setTab] = useState<Tab>("map");
  const [access, setAccess] = useState(true);
  const [detail, setDetail] = useState<{ id: string; own: boolean }>();
  useEffect(() => { void restoreSession(); }, []);
  useEffect(() => {
    if (session) setAccess(false);
    else { setTab("map"); setDetail(undefined); }
  }, [!!session]);
  function select(next: Tab) {
    if (next !== "map" && !session) { setAccess(true); return; }
    setDetail(undefined);
    setTab(next);
  }
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (detail) { setDetail(undefined); return true; }
      if (!access && tab !== "map" && tab !== "report") { setTab("map"); return true; }
      return false;
    });
    return () => handler.remove();
  }, [detail, access, tab]);
  return { session, ready, tab, access, detail, select, setDetail,
    login: () => setAccess(true), browse: () => { setAccess(false); setTab("map"); } };
}
