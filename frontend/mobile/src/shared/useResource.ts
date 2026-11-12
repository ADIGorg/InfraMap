import { useCallback, useEffect, useRef, useState } from "react";

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await load();
      if (current === generation.current) setData(result);
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : "Tente novamente.");
    } finally { if (current === generation.current) setLoading(false); }
  }, [load]);
  useEffect(() => { void reload(); return () => { generation.current++; }; }, [reload]);
  return { data, loading, error, reload };
}
