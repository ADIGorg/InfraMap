export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export async function listCategories(signal: AbortSignal): Promise<Category[]> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Configure EXPO_PUBLIC_API_BASE_URL no arquivo .env do app.");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/categories`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Confira a conexão e o endereço configurado.");
  }

  if (response.status === 429) {
    throw new Error("Muitas solicitações. Aguarde um pouco e tente novamente.");
  }

  if (!response.ok) {
    throw new Error("Não foi possível carregar as categorias. Tente novamente.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !("data" in body) || !Array.isArray(body.data)) {
    throw new Error("A API retornou um formato inesperado para as categorias.");
  }

  return body.data;
}
