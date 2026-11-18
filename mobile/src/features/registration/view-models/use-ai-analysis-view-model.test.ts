import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as AnalysisService from '../services/ai-analysis.service';
import * as PublicService from '@/features/occurrences/services/public-occurrences.service';
import { useRegistrationFlow } from '../models/registration.model';
import { analysisErrorMessage, useAiAnalysisViewModel } from './use-ai-analysis-view-model';

jest.mock('../services/ai-analysis.service');
jest.mock('@/features/occurrences/services/public-occurrences.service');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn(), getParent: jest.fn() }),
}));

const base = {
  id: 'analysis-1', category_code: null, suggested_description: null, confidence: null,
  model_name: null, prompt_version: null, error_code: null, photo_count: 1,
  created_at: '2026-11-17T20:00:00Z', completed_at: null,
};

describe('useAiAnalysisViewModel', () => {
  beforeEach(() => {
    jest.useRealTimers();
    useRegistrationFlow.getState().reset();
    useRegistrationFlow.getState().setAnalysis('analysis-1', 'PENDING');
    (PublicService.getCategories as jest.Mock).mockResolvedValue([
      { id: 'cat-7', code: 'CAT07', name: 'Outros' },
    ]);
  });

  it('processa PENDING para COMPLETED e aplica fallback CAT07', async () => {
    (AnalysisService.getAiAnalysis as jest.Mock)
      .mockResolvedValueOnce({ ...base, status: 'PENDING' })
      .mockResolvedValueOnce({ ...base, status: 'COMPLETED', category_code: 'CAT07', suggested_description: 'Descrição sugerida', confidence: 0.45 });

    const { result } = await renderHook(() => useAiAnalysisViewModel());
    await waitFor(() => expect(result.current.status).toBe('PENDING'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_600)); });
    await waitFor(() => expect(result.current.isCompleted).toBe(true));
    expect(result.current.isLowConfidence).toBe(true);
    expect(result.current.selectedCategory?.code).toBe('CAT07');
  });

  it('mapeia falha do provedor', () => {
    expect(analysisErrorMessage('AI_PROVIDER_UNAVAILABLE')).toContain('fora do ar');
  });
});
