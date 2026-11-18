import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NewOccurrenceStackParamList } from '@/navigation/types';
import type { CapturedPhoto, PhotoVisibility } from '@/shared/types/registration';
import { AppError } from '@/shared/errors/app-error';
import { capturePhoto, MAX_PHOTOS } from '@/infrastructure/device/camera.service';
import { useRegistrationFlow } from '../models/registration.model';
import { createAiAnalysis, startAiAnalysis } from '../services/upload.service';

type NavProp = NativeStackNavigationProp<NewOccurrenceStackParamList, 'CaptureEvidence'>;

export function useCaptureEvidenceViewModel() {
  const navigation = useNavigation<NavProp>();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photos = useRegistrationFlow((state) => state.photos);
  const visibility = useRegistrationFlow((state) => state.photoVisibility);
  const isSubmitting = useRegistrationFlow((state) => state.isSubmitting);
  const addPhoto = useRegistrationFlow((state) => state.addPhoto);
  const removePhoto = useRegistrationFlow((state) => state.removePhoto);
  const setVisibility = useRegistrationFlow((state) => state.setPhotoVisibility);
  const setAnalysis = useRegistrationFlow((state) => state.setAnalysis);
  const setCurrentStep = useRegistrationFlow((state) => state.setCurrentStep);
  const setSubmitting = useRegistrationFlow((state) => state.setSubmitting);
  const reset = useRegistrationFlow((state) => state.reset);

  const hasVisibilityChoice = visibility !== null;
  const canCapture = hasVisibilityChoice && photos.length < MAX_PHOTOS;
  const canContinue = hasVisibilityChoice && photos.length >= 1 && photos.length <= MAX_PHOTOS && !isSubmitting;
  const isPermissionDenied = permission?.status === 'denied' && permission.canAskAgain === false;

  const chooseVisibility = useCallback((value: Exclude<PhotoVisibility, null>) => {
    setVisibility(value);
    setError(null);
  }, [setVisibility]);

  const openCamera = useCallback(async () => {
    if (!hasVisibilityChoice) {
      setError('Escolha se as fotos serão públicas ou privadas antes da captura.');
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setError('O limite é de 3 fotos por ocorrência.');
      return;
    }

    let granted = permission?.granted ?? false;
    if (!granted) {
      const response = await requestPermission();
      granted = response.granted;
    }
    if (!granted) {
      setError('Para registrar uma ocorrência, permita o acesso à câmera.');
      return;
    }

    setPreview(null);
    setError(null);
    setIsCameraOpen(true);
  }, [hasVisibilityChoice, permission?.granted, photos.length, requestPermission]);

  const takePhoto = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setError(null);
    try {
      setPreview(await capturePhoto(cameraRef.current));
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'Falha ao capturar foto. Tente novamente.');
      setIsCameraOpen(false);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const confirmPreview = useCallback(() => {
    if (!preview) return;
    addPhoto(preview);
    setPreview(null);
    setIsCameraOpen(false);
  }, [addPhoto, preview]);

  const closeCamera = useCallback(() => {
    if (isCapturing) return;
    setPreview(null);
    setIsCameraOpen(false);
  }, [isCapturing]);

  const next = useCallback(async () => {
    if (!hasVisibilityChoice) {
      setError('Escolha se as fotos serão públicas ou privadas.');
      return;
    }
    if (photos.length < 1) {
      setError('Adicione pelo menos 1 foto.');
      return;
    }
    if (photos.length > MAX_PHOTOS || isSubmitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const analysis = await createAiAnalysis(photos);
      await startAiAnalysis(analysis.id);
      setAnalysis(analysis.id, analysis.status);
      setCurrentStep(2);
      navigation.navigate('Analysis');
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'Erro ao enviar as fotos. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [hasVisibilityChoice, isSubmitting, navigation, photos, setAnalysis, setCurrentStep, setSubmitting]);

  const cancel = useCallback(() => {
    reset();
    navigation.getParent()?.navigate('Map');
  }, [navigation, reset]);

  return {
    cameraRef,
    photos,
    visibility,
    permission,
    isPermissionDenied,
    isCameraOpen,
    preview,
    isCapturing,
    isSubmitting,
    error,
    canCapture,
    canContinue,
    chooseVisibility,
    openCamera,
    takePhoto,
    confirmPreview,
    retake: () => setPreview(null),
    closeCamera,
    removePhoto,
    openSettings: () => Linking.openSettings(),
    next,
    cancel,
  };
}
