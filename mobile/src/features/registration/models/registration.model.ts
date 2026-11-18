import { create } from 'zustand';
import type {
  AiAnalysisDetails,
  AiAnalysisStatus,
  CapturedPhoto,
  DataSource,
  PhotoVisibility,
} from '@/shared/types/registration';

interface RegistrationState {
  photos: CapturedPhoto[];
  photoVisibility: PhotoVisibility;
  analysisId: string | null;
  analysisStatus: AiAnalysisStatus | null;
  suggestedCategoryCode: string | null;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
  confidence: number | null;
  editedCategoryId: string | null;
  editedDescription: string;
  categorySource: DataSource;
  descriptionSource: DataSource;
  currentStep: 1 | 2 | 3 | 4 | 5;
  isSubmitting: boolean;
  addPhoto: (photo: CapturedPhoto) => void;
  removePhoto: (index: number) => void;
  setPhotoVisibility: (visibility: Exclude<PhotoVisibility, null>) => void;
  setAnalysis: (id: string, status: 'PENDING') => void;
  applyAnalysisResult: (analysis: AiAnalysisDetails, categoryId: string | null) => void;
  setAnalysisStatus: (status: AiAnalysisStatus) => void;
  setEditedCategory: (categoryId: string) => void;
  setEditedDescription: (description: string) => void;
  normalizeSources: () => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  setSubmitting: (value: boolean) => void;
  reset: () => void;
  clearAnalysisDraft: () => void;
  location: { lat: number; lng: number } | null;
  locationSource: 'GPS' | 'MANUAL' | null;
  locationAccuracy: number | null;
  setLocation: (
    location: { lat: number; lng: number },
    source: 'GPS' | 'MANUAL',
    accuracy?: number | null,
  ) => void;
}

function normalizedText(value: string | null | undefined) {
  return (value ?? '').trim();
}

export function normalizeDataSource(
  edited: string | null,
  suggested: string | null,
  hasSuggestion: boolean,
): DataSource {
  if (!hasSuggestion) return 'USER_MANUAL';
  return normalizedText(edited) === normalizedText(suggested)
    ? 'AI_CONFIRMED'
    : 'AI_EDITED';
}

const initialState = {
  photos: [] as CapturedPhoto[],
  photoVisibility: null as PhotoVisibility,
  analysisId: null as string | null,
  analysisStatus: null as AiAnalysisStatus | null,
  suggestedCategoryCode: null as string | null,
  suggestedCategoryId: null as string | null,
  suggestedDescription: null as string | null,
  confidence: null as number | null,
  editedCategoryId: null as string | null,
  editedDescription: '',
  categorySource: 'USER_MANUAL' as DataSource,
  descriptionSource: 'USER_MANUAL' as DataSource,
  currentStep: 1 as const,
  isSubmitting: false,
  location: null as { lat: number; lng: number } | null,
  locationSource: null as 'GPS' | 'MANUAL' | null,
  locationAccuracy: null as number | null,
};

export const useRegistrationFlow = create<RegistrationState>((set) => ({
  ...initialState,
  addPhoto: (photo) =>
    set((state) =>
      state.photos.length >= 3 ? state : { photos: [...state.photos, photo] },
    ),
  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, photoIndex) => photoIndex !== index),
    })),
  setPhotoVisibility: (photoVisibility) => set({ photoVisibility }),
  setAnalysis: (analysisId, analysisStatus) => set({ analysisId, analysisStatus }),
  applyAnalysisResult: (analysis, categoryId) =>
    set({
      analysisStatus: analysis.status,
      suggestedCategoryCode: analysis.category_code,
      suggestedCategoryId: categoryId,
      suggestedDescription: analysis.suggested_description,
      confidence: analysis.confidence,
      editedCategoryId: categoryId,
      editedDescription: analysis.suggested_description ?? '',
      categorySource: categoryId ? 'AI_CONFIRMED' : 'USER_MANUAL',
      descriptionSource: analysis.suggested_description
        ? 'AI_CONFIRMED'
        : 'USER_MANUAL',
    }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setEditedCategory: (editedCategoryId) =>
    set((state) => ({
      editedCategoryId,
      categorySource: normalizeDataSource(
        editedCategoryId,
        state.suggestedCategoryId,
        state.suggestedCategoryId !== null,
      ),
    })),
  setEditedDescription: (editedDescription) =>
    set((state) => ({
      editedDescription,
      descriptionSource: normalizeDataSource(
        editedDescription,
        state.suggestedDescription,
        state.suggestedDescription !== null,
      ),
    })),
  normalizeSources: () =>
    set((state) => ({
      categorySource: normalizeDataSource(
        state.editedCategoryId,
        state.suggestedCategoryId,
        state.suggestedCategoryId !== null,
      ),
      descriptionSource: normalizeDataSource(
        state.editedDescription,
        state.suggestedDescription,
        state.suggestedDescription !== null,
      ),
    })),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  reset: () => set(initialState),
  clearAnalysisDraft: () =>
    set({
      analysisId: null,
      analysisStatus: null,
      suggestedCategoryCode: null,
      suggestedCategoryId: null,
      suggestedDescription: null,
      confidence: null,
      editedCategoryId: null,
      editedDescription: '',
      categorySource: 'USER_MANUAL',
      descriptionSource: 'USER_MANUAL',
      currentStep: 1,
    }),
    setLocation: (location, locationSource, locationAccuracy = null) =>
    set({ location, locationSource, locationAccuracy }),
}));
