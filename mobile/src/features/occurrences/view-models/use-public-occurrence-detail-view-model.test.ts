import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePublicOccurrenceDetailViewModel } from './use-public-occurrence-detail-view-model';
import * as PublicService from '../services/public-occurrences.service';
import * as VotesService from '../services/votes.service';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigation } from '@react-navigation/native';
import { AppError } from '@/shared/errors/app-error';
import type { PublicOccurrenceDetail } from '@/shared/types/api';

jest.mock('../services/public-occurrences.service');
jest.mock('../services/votes.service');
jest.mock('@/features/auth/hooks/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

const makeDetail = (
  overrides: Partial<PublicOccurrenceDetail> = {},
): PublicOccurrenceDetail => ({
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Vazamento de água',
  status: 'CONFIRMED',
  location: { lat: -23.55, lng: -46.63 },
  votesCount: 214,
  createdAt: '2026-08-12T10:00:00Z',
  photoUrls: [
    {
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      position: 0,
      url: 'https://example.com/photo1.jpg',
      expiresAt: '2026-11-16T10:05:00Z',
      expiresInSeconds: 300,
    },
  ],
  ...overrides,
});

describe('usePublicOccurrenceDetailViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
    });
    (useAuth as jest.Mock).mockReturnValue({ session: { access_token: 'x' } });
    (PublicService.getPublicOccurrenceById as jest.Mock).mockResolvedValue(
      makeDetail(),
    );
  });

  // ─── Load ───
  it('carrega detalhe público no mount', async () => {
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail?.id).toBe('occ-1');
    expect(result.current.detail?.votesCount).toBe(214);
    expect(result.current.hasVoted).toBeNull();
  });

  it('404 no load navega para trás', async () => {
    (PublicService.getPublicOccurrenceById as jest.Mock).mockRejectedValueOnce(
      new AppError(404, 'NOT_FOUND', 'Não encontrada.'),
    );
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('status não-público defensivamente rejeitado (RN022)', async () => {
    (PublicService.getPublicOccurrenceById as jest.Mock).mockResolvedValueOnce(
      // Simula backend entregando status indevido
      { ...makeDetail(), status: 'RESOLVED' as never },
    );
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // ─── Vote flow (autenticado) ───
  it('voto: POST incrementa contagem e marca hasVoted=true', async () => {
    (VotesService.createVote as jest.Mock).mockResolvedValueOnce({
      occurrence_id: 'occ-1',
      vote_count: 215,
    });
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(VotesService.createVote).toHaveBeenCalledWith('occ-1');
    expect(result.current.hasVoted).toBe(true);
    expect(result.current.detail?.votesCount).toBe(215);
  });

  it('desfazer voto: DELETE decrementa e marca hasVoted=false', async () => {
    (PublicService.getPublicOccurrenceById as jest.Mock).mockResolvedValueOnce(
      makeDetail(),
    );
    (VotesService.createVote as jest.Mock).mockResolvedValueOnce({
      occurrence_id: 'occ-1',
      vote_count: 215,
    });
    (VotesService.removeVote as jest.Mock).mockResolvedValueOnce({
      occurrence_id: 'occ-1',
      vote_count: 214,
    });
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Vota
    await act(async () => {
      await result.current.handleVoteToggle();
    });
    expect(result.current.hasVoted).toBe(true);

    // Remove
    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(VotesService.removeVote).toHaveBeenCalledWith('occ-1');
    expect(result.current.hasVoted).toBe(false);
    expect(result.current.detail?.votesCount).toBe(214);
  });

  // ─── Vote guest ───
  it('visitante: abre prompt de login sem chamar API', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null });
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(result.current.isLoginPromptOpen).toBe(true);
    expect(VotesService.createVote).not.toHaveBeenCalled();
  });

  it('visitante: handleLoginFromPrompt navega para Login', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null });
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.handleLoginFromPrompt();
    });

    expect(mockNavigate).toHaveBeenCalledWith('AuthStack', { screen: 'Login' });
    expect(result.current.isLoginPromptOpen).toBe(false);
  });

  // ─── Erros de voto ───
  it('403 (autor/conta inativa): mantém neutro sem alterar contagem', async () => {
    (VotesService.createVote as jest.Mock).mockRejectedValueOnce(
      new AppError(403, 'FORBIDDEN', 'Você não pode votar na sua ocorrência.'),
    );
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(result.current.hasVoted).toBeNull();
    expect(result.current.voteError).toBe('Você não pode votar na sua ocorrência.');
    expect(result.current.detail?.votesCount).toBe(214);
  });

  it('409 (já votou): marca hasVoted=true sem alterar contagem', async () => {
    (VotesService.createVote as jest.Mock).mockRejectedValueOnce(
      new AppError(409, 'CONFLICT', 'Você já votou nesta ocorrência.'),
    );
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(result.current.hasVoted).toBe(true);
    expect(result.current.voteError).toBe('Você já votou nesta ocorrência.');
    expect(result.current.detail?.votesCount).toBe(214);
  });

  it('404 no voto navega para trás', async () => {
    (VotesService.createVote as jest.Mock).mockRejectedValueOnce(
      new AppError(404, 'NOT_FOUND', 'Ocorrência removida.'),
    );
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleVoteToggle();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  // ─── URL expiração ───
  it('reload() refaz a chamada (proxy de URL expirada)', async () => {
    const { result } = await renderHook(() =>
      usePublicOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(PublicService.getPublicOccurrenceById).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.reload();
    });

    expect(PublicService.getPublicOccurrenceById).toHaveBeenCalledTimes(2);
  });
});