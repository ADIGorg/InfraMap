import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getPublicOccurrenceById } from '../services/public-occurrences.service';
import { createVote, removeVote } from '../services/votes.service';
import { AppError } from '@/shared/errors/app-error';
import type { PublicOccurrenceDetail } from '@/shared/types/api';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Refetch automático 10s antes do menor expiresInSeconds entre as fotos.
// Fallback: 300s (default do backend) se array vazio.
const MIN_REFRESH_SECONDS = 30;

interface Params {
  id: string;
}

export function usePublicOccurrenceDetailViewModel({ id }: Params) {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();

  const [detail, setDetail] = useState<PublicOccurrenceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // null = desconhecido (backend não informa). Só vira boolean após resposta explícita.
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const d = await getPublicOccurrenceById(id);
      // Defesa em profundidade (RN022) — backend já filtra
      if (d.status !== 'CONFIRMED' && d.status !== 'IN_SERVICE') {
        throw new AppError(404, 'NOT_FOUND', 'Ocorrência não disponível.');
      }
      setDetail(d);

      // Agenda refetch antes da expiração das signed URLs (RN017)
      clearRefreshTimer();
      const expiresIn = d.photoUrls.length
        ? Math.min(...d.photoUrls.map((p) => p.expiresInSeconds))
        : 300;
      const delayMs = Math.max(expiresIn - 10, MIN_REFRESH_SECONDS) * 1000;
      refreshTimerRef.current = setTimeout(() => {
        load();
      }, delayMs);
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) {
        navigation.goBack();
        return;
      }
      setLoadError(
        err instanceof AppError
          ? err.message
          : 'Não foi possível carregar a ocorrência.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    load();
    return () => clearRefreshTimer();
  }, [load]);

  const handleVoteToggle = useCallback(async () => {
    if (!session) {
      setIsLoginPromptOpen(true);
      return;
    }
    if (!detail || isVoting) return;

    setIsVoting(true);
    setVoteError(null);

    const currentlyVoted = hasVoted === true;

    try {
      if (currentlyVoted) {
        const res = await removeVote(id);
        setHasVoted(false);
        setDetail((prev) =>
          prev ? { ...prev, votesCount: res.vote_count } : prev,
        );
      } else {
        const res = await createVote(id);
        setHasVoted(true);
        setDetail((prev) =>
          prev ? { ...prev, votesCount: res.vote_count } : prev,
        );
      }
    } catch (err) {
      if (err instanceof AppError) {
        if (err.statusCode === 409) {
          // Já votou (ou não elegível). Sem alteração de contagem.
          setHasVoted(true);
          setVoteError(err.message);
        } else if (err.statusCode === 403) {
          // Autor na própria / conta inativa — mantém neutro
          setVoteError(err.message);
        } else if (err.statusCode === 404) {
          // Ocorrência removida entre carregar e votar
          navigation.goBack();
          return;
        } else {
          setVoteError(err.message);
        }
      } else {
        setVoteError('Não foi possível processar o voto. Tente novamente.');
      }
    } finally {
      setIsVoting(false);
    }
  }, [session, detail, hasVoted, isVoting, id, navigation]);

  const handleLoginFromPrompt = useCallback(() => {
    setIsLoginPromptOpen(false);
    navigation.navigate('AuthStack', { screen: 'Login' });
  }, [navigation]);

  const handleCloseLoginPrompt = useCallback(() => {
    setIsLoginPromptOpen(false);
  }, []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return {
    detail,
    isLoading,
    loadError,
    reload: load,
    hasVoted,
    isVoting,
    voteError,
    isLoginPromptOpen,
    handleVoteToggle,
    handleLoginFromPrompt,
    handleCloseLoginPrompt,
    goBack,
  };
}