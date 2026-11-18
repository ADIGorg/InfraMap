import { normalizeDataSource, useRegistrationFlow } from './registration.model';
import type { AiAnalysisDetails } from '@/shared/types/registration';

const completed: AiAnalysisDetails = {
  id: 'analysis-1', status: 'COMPLETED', category_code: 'CAT01', suggested_description: 'Vazamento de água', confidence: 0.92,
  model_name: 'gemini', prompt_version: 'v1', error_code: null, photo_count: 1, created_at: '2026-11-17T20:00:00Z', completed_at: '2026-11-17T20:00:05Z',
};

describe('modelo de registro - análise IA', () => {
  beforeEach(() => useRegistrationFlow.getState().reset());

  it('aplica resultado COMPLETED como AI_CONFIRMED', () => {
    useRegistrationFlow.getState().applyAnalysisResult(completed, 'category-1');
    const state = useRegistrationFlow.getState();
    expect(state.editedCategoryId).toBe('category-1');
    expect(state.editedDescription).toBe('Vazamento de água');
    expect(state.categorySource).toBe('AI_CONFIRMED');
    expect(state.descriptionSource).toBe('AI_CONFIRMED');
  });

  it('marca edição e volta para AI_CONFIRMED quando igual à sugestão', () => {
    useRegistrationFlow.getState().applyAnalysisResult(completed, 'category-1');
    useRegistrationFlow.getState().setEditedDescription('Texto alterado');
    expect(useRegistrationFlow.getState().descriptionSource).toBe('AI_EDITED');
    useRegistrationFlow.getState().setEditedDescription('  Vazamento de água  ');
    expect(useRegistrationFlow.getState().descriptionSource).toBe('AI_CONFIRMED');
  });

  it('usa USER_MANUAL quando não existe sugestão', () => {
    expect(normalizeDataSource('category-7', null, false)).toBe('USER_MANUAL');
  });
});
