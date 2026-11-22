import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NewOccurrenceStackParamList } from '@/navigation/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AppError } from '@/shared/errors/app-error';
import { getCurrentLocation, getReferenceAddress, validateCoordinates } from '@/infrastructure/device/location.service';
import { useRegistrationFlow } from '../models/registration.model';
import { buildTemporaryPhotoPath, finalizeOccurrence, occurrenceIdFromErrorMessage } from '../services/occurrence.service';

type NavProp = NativeStackNavigationProp<NewOccurrenceStackParamList, 'Location'>;
const DEFAULT_MANUAL_LOCATION = { lat: -12.2664, lng: -38.9663 };

export function useOccurrenceLocationViewModel() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const submittingRef = useRef(false);
  const addressRequestRef = useRef(0);

  const photos = useRegistrationFlow((s) => s.photos);
  const photoVisibility = useRegistrationFlow((s) => s.photoVisibility);
  const analysisId = useRegistrationFlow((s) => s.analysisId);
  const analysisStatus = useRegistrationFlow((s) => s.analysisStatus);
  const categoryId = useRegistrationFlow((s) => s.editedCategoryId);
  const description = useRegistrationFlow((s) => s.editedDescription);
  const categorySource = useRegistrationFlow((s) => s.categorySource);
  const descriptionSource = useRegistrationFlow((s) => s.descriptionSource);
  const location = useRegistrationFlow((s) => s.location);
  const locationSource = useRegistrationFlow((s) => s.locationSource);
  const setLocation = useRegistrationFlow((s) => s.setLocation);
  const setCurrentStep = useRegistrationFlow((s) => s.setCurrentStep);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualMode, setIsManualMode] = useState(locationSource === 'MANUAL');
  const [address, setAddress] = useState('Selecione uma localização');
  const [error, setError] = useState<string | null>(null);
  const [attemptWasAmbiguous, setAttemptWasAmbiguous] = useState(false);

  const updateAddress = useCallback(async (lat: number, lng: number) => {
    const request = ++addressRequestRef.current;
    setAddress('Buscando endereço de referência...');
    const referenceAddress = await getReferenceAddress(lat, lng);
    if (request === addressRequestRef.current) setAddress(referenceAddress);
  }, []);

  const useGps = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);
    setError(null);
    try {
      const result = await getCurrentLocation();
      setLocation({ lat: result.lat, lng: result.lng }, 'GPS', result.accuracy);
      setIsManualMode(false);
      await updateAddress(result.lat, result.lng);
    } catch (caught) {
      const message = caught instanceof AppError ? caught.message : 'Não foi possível obter a localização.';
      setError(message);
      setIsManualMode(true);
      if (!location) setLocation(DEFAULT_MANUAL_LOCATION, 'MANUAL');
    } finally {
      setIsLocating(false);
    }
  }, [isLocating, location, setLocation, updateAddress]);

  const openManualMap = useCallback(() => {
    setError(null);
    setIsManualMode(true);
    const coordinate = location ?? DEFAULT_MANUAL_LOCATION;
    setLocation(coordinate, 'MANUAL');
    void updateAddress(coordinate.lat, coordinate.lng);
  }, [location, setLocation, updateAddress]);

  const changeManualLocation = useCallback((coordinate: { lat: number; lng: number }) => {
    if (!validateCoordinates(coordinate.lat, coordinate.lng)) {
      setError('Selecione uma coordenada válida no mapa.');
      return;
    }
    setLocation(coordinate, 'MANUAL');
    setError(null);
    void updateAddress(coordinate.lat, coordinate.lng);
  }, [setLocation, updateAddress]);

  const draftError = useMemo(() => {
    if (!userId) { return 'Sessão inválida. Entre novamente.'; }
    if (!analysisId || analysisStatus !== 'COMPLETED') return 'A análise precisa estar concluída.';
    if (!categoryId) return 'Selecione uma categoria.';
    if (!description.trim() || description.trim().length > 500) return 'Revise a descrição antes de enviar.';
    if (photos.length < 1 || photos.length > 3) return 'Mantenha de 1 a 3 fotos.';
    if (!photoVisibility) return 'Escolha a privacidade das fotos.';
    if (!location || !validateCoordinates(location.lat, location.lng)) return 'Defina uma localização válida.';
    return null;
  }, [analysisId, analysisStatus, categoryId, description, location, photoVisibility, photos.length, userId ]);

  const submit = useCallback(async () => {
    if (submittingRef.current || draftError || !location || !analysisId || !photoVisibility || !categoryId || !userId) {
      if (draftError) setError(draftError);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setAttemptWasAmbiguous(false);
    try {
      const result = await finalizeOccurrence({
        aiAnalysisId: analysisId,
        categoryId,
        description: description.trim(),
        location,
        categorySource,
        descriptionSource,
        photos: photos.map((photo, index) => ({
          storagePath: buildTemporaryPhotoPath(userId, analysisId, index, photo.mimeType),
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
        })),
        photoPublicConsent: photoVisibility === 'PUBLIC',
      });
      setCurrentStep(5);
      navigation.replace('Success', { occurrenceId: result.id });
    } catch (caught) {
      if (caught instanceof AppError) {
        const recoveredId = occurrenceIdFromErrorMessage(caught.message);
        if (recoveredId) {
          setCurrentStep(5);
          navigation.replace('Success', { occurrenceId: recoveredId });
          return;
        }
        if (caught.statusCode === 408 || caught.code === 'TIMEOUT') {
          setAttemptWasAmbiguous(true);
          setError('Não foi possível confirmar o envio. Verifique Minhas ocorrências antes de tentar novamente.');
        } else if (caught.statusCode === 409) {
          setError('A análise já foi consumida ou não está disponível. Verifique Minhas ocorrências.');
        } else if (caught.statusCode >= 500) {
          setError('O servidor não confirmou o registro. Tente novamente somente após verificar Minhas ocorrências.');
        } else {
          setError(caught.message);
        }
      } else {
        setAttemptWasAmbiguous(true);
        setError('Falha de rede. Verifique Minhas ocorrências antes de tentar novamente.');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [analysisId, categoryId, categorySource, description, descriptionSource, draftError, location, navigation, photoVisibility, photos, userId, setCurrentStep]);

  const back = useCallback(() => {
    if (!isSubmitting) navigation.navigate('Review');
  }, [isSubmitting, navigation]);

  const goToMine = useCallback(() => {
    navigation.getParent()?.navigate('MyOccurrences');
  }, [navigation]);

  return {
    location,
    locationSource,
    address,
    error,
    isLocating,
    isSubmitting,
    isManualMode,
    attemptWasAmbiguous,
    canSubmit: draftError === null && !isSubmitting,
    useGps,
    openManualMap,
    changeManualLocation,
    submit,
    back,
    goToMine,
  };
}
