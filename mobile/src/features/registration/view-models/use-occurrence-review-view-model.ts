import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NewOccurrenceStackParamList } from '@/navigation/types';
import type { CategorySummary } from '@/shared/types/api';
import { getCategories } from '@/features/occurrences/services/public-occurrences.service';
import { useRegistrationFlow } from '../models/registration.model';

type NavProp = NativeStackNavigationProp<NewOccurrenceStackParamList, 'Review'>;
export function validateReviewDraft({ photosCount, description, categoryId, activeCategories }: { photosCount: number; description: string; categoryId: string | null; activeCategories: CategorySummary[] }) {
  const errors: { photos?: string; description?: string; category?: string } = {};
  const normalizedDescription = description.trim();
  if (photosCount < 1 || photosCount > 3) errors.photos = 'Mantenha de 1 a 3 evidências fotográficas.';
  if (!normalizedDescription) errors.description = 'Informe uma descrição.';
  else if (normalizedDescription.length > 500) errors.description = 'A descrição deve ter no máximo 500 caracteres.';
  if (!categoryId || !activeCategories.some((category) => category.id === categoryId)) errors.category = 'Selecione uma categoria ativa.';
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function useOccurrenceReviewViewModel() {
  const navigation = useNavigation<NavProp>();
  const photos = useRegistrationFlow((s) => s.photos); const editedCategoryId = useRegistrationFlow((s) => s.editedCategoryId); const editedDescription = useRegistrationFlow((s) => s.editedDescription);
  const categorySource = useRegistrationFlow((s) => s.categorySource); const descriptionSource = useRegistrationFlow((s) => s.descriptionSource);
  const setEditedCategory = useRegistrationFlow((s) => s.setEditedCategory); const setEditedDescription = useRegistrationFlow((s) => s.setEditedDescription); const normalizeSources = useRegistrationFlow((s) => s.normalizeSources); const setCurrentStep = useRegistrationFlow((s) => s.setCurrentStep); const clearAnalysisDraft = useRegistrationFlow((s) => s.clearAnalysisDraft);
  const [categories, setCategories] = useState<CategorySummary[]>([]); const [isLoadingCategories, setIsLoadingCategories] = useState(true); const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null); const [categoryError, setCategoryError] = useState<string | null>(null); const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false); const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => { let cancelled = false; const timer = setTimeout(() => { void getCategories().then((r) => { if (!cancelled) setCategories(r); }).catch(() => { if (!cancelled) setCategoryLoadError('Não foi possível carregar as categorias.'); }).finally(() => { if (!cancelled) setIsLoadingCategories(false); }); }, 0); return () => { cancelled = true; clearTimeout(timer); }; }, []);
  const selectedCategory = useMemo(() => categories.find((c) => c.id === editedCategoryId) ?? null, [categories, editedCategoryId]);
  const validate = useCallback(() => { const r = validateReviewDraft({ photosCount: photos.length, description: editedDescription, categoryId: editedCategoryId, activeCategories: categories }); setPhotoError(r.errors.photos ?? null); setDescriptionError(r.errors.description ?? null); setCategoryError(r.errors.category ?? null); return r.isValid; }, [categories, editedCategoryId, editedDescription, photos.length]);
  const selectCategory = useCallback((id: string) => { setEditedCategory(id); setCategoryError(null); setIsCategoryModalOpen(false); }, [setEditedCategory]);
  const changeDescription = useCallback((v: string) => { setEditedDescription(v); setDescriptionError(null); }, [setEditedDescription]);
  const confirm = useCallback(() => { if (isLoadingCategories || !validate()) return; normalizeSources(); setCurrentStep(4); navigation.navigate('Location'); }, [isLoadingCategories, navigation, normalizeSources, setCurrentStep, validate]);
  const back = useCallback(() => { normalizeSources(); setCurrentStep(2); navigation.navigate('Analysis'); }, [navigation, normalizeSources, setCurrentStep]);
  const editPhotos = useCallback(() => { Alert.alert('Editar evidências?', 'Alterar as fotos exige uma nova análise. A categoria e a descrição sugeridas serão descartadas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Editar fotos', style: 'destructive', onPress: () => { clearAnalysisDraft(); navigation.navigate('CaptureEvidence'); } }]); }, [clearAnalysisDraft, navigation]);
  return { photos, categories, selectedCategory, editedCategoryId, editedDescription, categorySource, descriptionSource, isLoadingCategories, categoryLoadError, descriptionError, categoryError, photoError, isDescriptionEditing, isCategoryModalOpen, setDescriptionEditing: setIsDescriptionEditing, setCategoryModalOpen: setIsCategoryModalOpen, selectCategory, changeDescription, editPhotos, confirm, back };
}
