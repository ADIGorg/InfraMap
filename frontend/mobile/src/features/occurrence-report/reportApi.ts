import { api } from "../../shared/http";
import type { Category } from "../occurrences/occurrencesApi";
export interface Photo { uri: string; mimeType: "image/jpeg" | "image/png"; sizeBytes: number }
export interface Analysis {
  id: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "CONSUMED" | "UPLOADING";
  category_code: string | null; suggested_description: string | null; confidence: number | null;
}
export interface Draft {
  photos: Photo[]; analysis: Analysis; category: Category; description: string;
  location: { lat: number; lng: number };
}
export const getCategories = () => api<{ data: Category[] }>("/categories");
export async function uploadPhotos(photos: Photo[]) {
  const form = new FormData();
  photos.forEach((photo, index) => {
    form.append("photos", { uri: photo.uri, type: photo.mimeType,
      name: `photo-${index + 1}.${photo.mimeType === "image/png" ? "png" : "jpg"}` } as unknown as Blob);
  });
  return api<{ data: { id: string } }>("/ai-analyses", { method: "POST", body: form, authenticated: true });
}
export const analyze = (id: string) => api(`/ai-analyses/${id}/analyze`, { method: "POST", authenticated: true });
export const getAnalysis = (id: string) => api<{ data: Analysis }>(`/ai-analyses/${id}`, { authenticated: true });
export async function finalize(draft: Draft) {
  const identity = await api<{ id: string }>("/app/me", { authenticated: true });
  // Matches CreateAiAnalysisUseCase's upload convention in the current backend.
  // The API requires storagePath but does not return it from the upload response.
  const photos = draft.photos.map((photo, index) => ({
    storagePath: `temporary/${identity.id}/${draft.analysis.id}/photo-${index + 1}.${photo.mimeType === "image/png" ? "png" : "jpg"}`,
    mimeType: photo.mimeType, sizeBytes: photo.sizeBytes,
  }));
  return api<{ data: { id: string; status: "RECEIVED" } }>("/occurrences/finalize", {
    method: "POST", authenticated: true,
    body: { aiAnalysisId: draft.analysis.id, categoryId: draft.category.id,
      description: draft.description.trim(), location: draft.location, photos,
      categorySource: draft.category.code === draft.analysis.category_code ? "AI_CONFIRMED" : "AI_EDITED",
      descriptionSource: draft.description.trim() === draft.analysis.suggested_description?.trim() ? "AI_CONFIRMED" : "AI_EDITED" },
  });
}
