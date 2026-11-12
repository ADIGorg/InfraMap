import { useEffect, useState } from "react";

import { listCategories, type Category } from "./categoriesApi";

type CategoriesState =
  | { status: "loading" }
  | { status: "loaded"; categories: Category[] }
  | { status: "error"; message: string };

export function useCategoriesViewModel() {
  const [state, setState] = useState<CategoriesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      try {
        const categories = await listCategories(signal);
        if (!signal.aborted) {
          setState({ status: "loaded", categories });
        }
      } catch (error) {
        if (!signal.aborted) {
          const message = error instanceof Error ? error.message : "Erro ao carregar as categorias.";
          setState({ status: "error", message });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }

  return { state, retry };
}
