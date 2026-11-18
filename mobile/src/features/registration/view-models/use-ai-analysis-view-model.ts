import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NewOccurrenceStackParamList } from '@/navigation/types';
import type { CategorySummary } from '@/shared/types/api';
import type { AiAnalysisStatus } from '@/shared/types/registration';
import { AppError } from '@/shared/errors/app-error';
import { getCategories } from '@/features/occurrences/services/public-occurrences.service';
import { useRegistrationFlow } from '../models/registration.model';
import { getAiAnalysis, startAiAnalysis } from '../services/ai-analysis.service';

const POLLING_INTERVAL_MS = 1_500;
const MAX_POLL_ATTEMPTS = 30;
type NavProp = NativeStackNavigationProp<NewOccurrenceStackParamList, 'Analysis'>;

const FAILED_MESSAGES: Record<string, string> = {
  AI_FREE_QUOTA_EXCEEDED: 'Análise temporariamente indisponível. Tente em alguns minutos.',
  AI_PROVIDER_UNAVAILABLE: 'Serviço de análise fora do ar. Tente novamente.',
  AI_INVALID_RESPONSE: 'Resultado inesperado. Tente novamente.',
  AI_PROCESSING_FAILED: 'Erro ao processar a análise. Tente novamente.',
};

export function analysisErrorMessage(code: string | null): string {
  return code ? FAILED_MESSAGES[code] ?? 'Erro ao processar a análise. Tente novamente.' : 'Erro ao processar a análise. Tente novamente.';
}

export function useAiAnalysisViewModel() {
  const navigation = useNavigation<NavProp>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const attemptsRef = useRef(0);
  const pollOnceRef = useRef<() => Promise<void>>( async () => undefined, );
  const analysisId = useRegistrationFlow((state) => state.analysisId);
  const storedStatus = useRegistrationFlow((state) => state.analysisStatus);
  const editedCategoryId = useRegistrationFlow((state) => state.editedCategoryId);
  const editedDescription = useRegistrationFlow((state) => state.editedDescription);
  const suggestedCategoryId = useRegistrationFlow((state) => state.suggestedCategoryId);
  const suggestedDescription = useRegistrationFlow((state) => state.suggestedDescription);
  const confidence = useRegistrationFlow((state) => state.confidence);
  const categorySource = useRegistrationFlow((state) => state.categorySource);
  const descriptionSource = useRegistrationFlow((state) => state.descriptionSource);
  const applyAnalysisResult = useRegistrationFlow((state) => state.applyAnalysisResult);
  const setAnalysisStatus = useRegistrationFlow((state) => state.setAnalysisStatus);
  const setEditedCategory = useRegistrationFlow((state) => state.setEditedCategory);
  const setEditedDescription = useRegistrationFlow((state) => state.setEditedDescription);
  const normalizeSources = useRegistrationFlow((state) => state.normalizeSources);
  const setCurrentStep = useRegistrationFlow((state) => state.setCurrentStep);
  const reset = useRegistrationFlow((state) => state.reset);

  const [status, setStatus] = useState<AiAnalysisStatus | null>(storedStatus);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async (): Promise<void> => {
    if (!analysisId || !mountedRef.current) return;
    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      setIsTimedOut(true);
      setError('A análise está demorando mais que o esperado. Tente novamente.');
      return;
    }

    attemptsRef.current += 1;
    try {
      const analysis = await getAiAnalysis(analysisId);
      if (!mountedRef.current) return;
      setStatus(analysis.status);
      setAnalysisStatus(analysis.status);

      if (analysis.status === 'COMPLETED') {
        stopPolling();
        const categoriesResult = await getCategories();
        if (!mountedRef.current) return;
        setCategories(categoriesResult);
        const matched = categoriesResult.find((category) => category.code === analysis.category_code);
        applyAnalysisResult(analysis, matched?.id ?? null);
        return;
      }
      if (analysis.status === 'FAILED' || analysis.status === 'CANCELLED') {
        stopPolling();
        setError(analysisErrorMessage(analysis.error_code));
        return;
      }
      if (analysis.status === 'CONSUMED') {
        stopPolling();
        navigation.replace('Success', { occurrenceId: analysis.id });
        return;
      }

      timerRef.current = setTimeout(() => {
        void pollOnceRef.current(); 
      }, POLLING_INTERVAL_MS);
    } catch (caught) {
      stopPolling();
      setError(caught instanceof AppError ? caught.message : 'Não foi possível consultar a análise.');
    }
  }, [analysisId, applyAnalysisResult, navigation, setAnalysisStatus, stopPolling]);

  useEffect(() => { 
    pollOnceRef.current = pollOnce; 
  }, [pollOnce]);

  useEffect(() => {
    mountedRef.current = true;
    const startTimer = setTimeout(() => {
      if (!analysisId) {
        setError('Análise não encontrada. Reinicie o registro.');
        return;
      }
      void pollOnce();
    }, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(startTimer);
      stopPolling();
    };
  }, [analysisId, pollOnce, stopPolling]);

  const retry = useCallback(async () => {
    if (!analysisId || isRetrying) return;
    stopPolling();
    setIsRetrying(true);
    setError(null);
    setIsTimedOut(false);
    attemptsRef.current = 0;
    try {
      await startAiAnalysis(analysisId);
      setStatus('PENDING');
      setAnalysisStatus('PENDING');
      await pollOnce();
    } catch (caught) {
      setError(caught instanceof AppError ? caught.message : 'Não foi possível repetir a análise.');
    } finally {
      setIsRetrying(false);
    }
  }, [analysisId, isRetrying, pollOnce, setAnalysisStatus, stopPolling]);

  const confirm = useCallback(() => {
    if (status !== 'COMPLETED') return;
    if (!editedCategoryId) {
      setError('Selecione uma categoria para continuar.');
      return;
    }
    if (!editedDescription.trim()) {
      setError('Informe uma descrição para continuar.');
      return;
    }
    normalizeSources();
    setCurrentStep(3);
    navigation.navigate('Review');
  }, [editedCategoryId, editedDescription, navigation, normalizeSources, setCurrentStep, status]);

  const cancel = useCallback(() => {
    const processing = status === 'PENDING' || status === 'PROCESSING';
    Alert.alert(
      processing ? 'Análise em andamento' : 'Cancelar registro?',
      processing ? 'A análise está em andamento. Deseja descartar todo o registro?' : 'As informações deste registro serão descartadas.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            stopPolling();
            reset();
            navigation.getParent()?.navigate('Map');
          },
        },
      ],
    );
  }, [navigation, reset, status, stopPolling]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === editedCategoryId) ?? null,
    [categories, editedCategoryId],
  );
  const isProcessing = status === 'PENDING' || status === 'PROCESSING' || status === 'UPLOADING';
  const isCompleted = status === 'COMPLETED';
  const isLowConfidence = confidence !== null && confidence < 0.7;

  return {
    status,
    categories,
    selectedCategory,
    editedCategoryId,
    editedDescription,
    suggestedCategoryId,
    suggestedDescription,
    confidence,
    categorySource,
    descriptionSource,
    error,
    isTimedOut,
    isRetrying,
    isProcessing,
    isCompleted,
    isLowConfidence,
    isCategoryModalOpen,
    setCategoryModalOpen: setIsCategoryModalOpen,
    selectCategory: (id: string) => {
      setEditedCategory(id);
      setIsCategoryModalOpen(false);
      setError(null);
    },
    editDescription: (value: string) => {
      setEditedDescription(value);
      setError(null);
    },
    retry,
    confirm,
    cancel,
  };
}
