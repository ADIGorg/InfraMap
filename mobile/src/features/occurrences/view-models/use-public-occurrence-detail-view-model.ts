import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getPublicOccurrenceById } from '../services/public-occurrences.service';
import { createVote, removeVote } from '../services/votes.service';
import { readRecordedVote, recordVoteState } from '../services/vote-state-storage';
import { AppError } from '@/shared/errors/app-error';
import type { PublicOccurrenceDetail } from '@/shared/types/api';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Refetch automático 10s antes do menor expiresInSeconds entre as fotos.
// Fallback: 300s (default do backend) se array vazio.
const MIN_REFRESH_SECONDS = 30;
// A API usa 409 também para ocorrências inelegíveis, com a mesma identificação de erro.
const DUPLICATE_VOTE_MESSAGE = 'Você já votou nesta ocorrência.';

interface Params {
  id: string;
}

export function usePublicOccurrenceDetailViewModel({ id }: Params) {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const voteKey = userId ? `${userId}.${id}` : null;

  const [detail, setDetail] = useState<PublicOccurrenceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [voteState, setVoteState] = useState<{ key: string; voted: boolean | null } | null>(null);
  const hasVoted = voteState?.key === voteKey ? voteState?.voted ?? null : null;
  const isRestoringVote = voteKey !== null && voteState?.key !== voteKey;
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voteInFlight = useRef(false);

  useEffect(() => {
    if (!userId || !voteKey) return;
    let active = true;
    void readRecordedVote(userId, id).then((voted) => {
      if (active) setVoteState({ key: voteKey, voted });
    });
    return () => {
      active = false;
    };
  }, [id, userId, voteKey]);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const load = useCallback(
  async (showLoader = true): Promise<void> => {
    if (showLoader) {
      setIsLoading(true);
    }

    setLoadError(null);

    try {
      const occurrence = await getPublicOccurrenceById(id);

      // Defesa adicional conforme RN022.
      if (
        occurrence.status !== 'CONFIRMED' &&
        occurrence.status !== 'IN_SERVICE'
      ) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Ocorrência não disponível.',
        );
      }

      setDetail(occurrence);
    } catch (err) {
      if (
        err instanceof AppError &&
        err.statusCode === 404
      ) {
        setDetail(null);
        navigation.goBack();
        return;
      }

      setLoadError(
        err instanceof AppError
          ? err.message
          : 'Não foi possível carregar a ocorrência.',
      );
    } finally {
          if (showLoader) {
            setIsLoading(false);
          }
        }
  }, [id, navigation],);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [load]);

  useEffect(() => {
    clearRefreshTimer();

    if (!detail?.photoUrls.length) {
      return undefined;
    }

    const shortestExpirationSeconds = Math.min(
      ...detail.photoUrls.map(
        (photo) => photo.expiresInSeconds,
      ),
    );

    // Mantém a regra anterior deste ViewModel:
    // renovação 10 segundos antes, com mínimo de 30 segundos.
    const refreshAfterSeconds = Math.max(
      shortestExpirationSeconds - 10,
      MIN_REFRESH_SECONDS,
    );

    refreshTimerRef.current = setTimeout(() => {
      void load(false);
    }, refreshAfterSeconds * 1000);

    return clearRefreshTimer;
  }, [
    detail?.photoUrls,
    load,
    clearRefreshTimer,
  ]);

  const handleVoteToggle = useCallback(async () => {
    if (!userId || !voteKey) {
      setIsLoginPromptOpen(true);
      return;
    }
    if (detail?.id !== id || isRestoringVote || voteInFlight.current) return;

    voteInFlight.current = true;
    setIsVoting(true);
    setVoteError(null);

    try {
      const voted = hasVoted !== true;
      const res = voted ? await createVote(id) : await removeVote(id);
      setVoteState((prev) => prev?.key === voteKey ? { key: voteKey, voted } : prev);
      setDetail((prev) => prev?.id === id ? { ...prev, votesCount: res.vote_count } : prev);
      await recordVoteState(userId, id, voted);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.statusCode === 409 && err.message === DUPLICATE_VOTE_MESSAGE) {
          setVoteState((prev) => prev?.key === voteKey ? { key: voteKey, voted: true } : prev);
          await recordVoteState(userId, id, true);
        } else if (err.statusCode === 403) {
          // Autor na própria / conta inativa — mantém neutro
          setVoteError(err.message);
        } else if (err.statusCode === 404) {
          if (hasVoted) await recordVoteState(userId, id, false);
          navigation.goBack();
          return;
        } else {
          setVoteError(err.message);
        }
      } else {
        setVoteError('Não foi possível processar o voto. Tente novamente.');
      }
    } finally {
      voteInFlight.current = false;
      setIsVoting(false);
    }
  }, [userId, voteKey, detail?.id, isRestoringVote, hasVoted, id, navigation]);

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
    isVoting: isRestoringVote || isVoting,
    voteError,
    isLoginPromptOpen,
    handleVoteToggle,
    handleLoginFromPrompt,
    handleCloseLoginPrompt,
    goBack,
  };
}
