import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as PublicService from '@/features/occurrences/services/public-occurrences.service';
import { useRegistrationFlow } from '../models/registration.model';
import { validateReviewDraft, useOccurrenceReviewViewModel } from './use-occurrence-review-view-model';

const mockNavigate = jest.fn();

jest.mock('@/features/occurrences/services/public-occurrences.service');

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate, getParent: jest.fn(), }), }));

const categories = [{ id: 'cat-1', code: 'CAT01', name: 'Vazamento de água' }];

function seedDraft() { const s = useRegistrationFlow.getState(); s.reset(); s.addPhoto({ uri: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 100, width: 100, height: 100 }); s.applyAnalysisResult({ id: 'analysis-1', status: 'COMPLETED', category_code: 'CAT01', suggested_description: 'Descrição sugerida', confidence: 0.9, model_name: 'gemini', prompt_version: 'v1', error_code: null, photo_count: 1, created_at: '2026-11-17T20:00:00Z', completed_at: '2026-11-17T20:00:05Z' }, 'cat-1'); }
describe('validateReviewDraft', () => { it('rejeita descrição vazia, longa e categoria inválida', () => { expect(validateReviewDraft({ photosCount: 1, description: ' ', categoryId: 'bad', activeCategories: categories }).isValid).toBe(false); expect(validateReviewDraft({ photosCount: 1, description: 'a'.repeat(501), categoryId: 'cat-1', activeCategories: categories }).errors.description).toContain('500'); }); });
describe('useOccurrenceReviewViewModel', () => { beforeEach(() => { jest.clearAllMocks(); seedDraft(); (PublicService.getCategories as jest.Mock).mockResolvedValue(categories); });
it('preserva edição ao voltar', async () => { const { result } = await renderHook(() => useOccurrenceReviewViewModel()); await waitFor(() => expect(result.current.isLoadingCategories).toBe(false)); await act(async () => result.current.changeDescription('Descrição editada')); await act(async () => result.current.back()); expect(useRegistrationFlow.getState().editedDescription).toBe('Descrição editada'); expect(useRegistrationFlow.getState().descriptionSource).toBe('AI_EDITED'); expect(mockNavigate).toHaveBeenCalledWith('Analysis'); });
it('confirma draft válido sem mutation', async () => { const { result } = await renderHook(() => useOccurrenceReviewViewModel()); await waitFor(() => expect(result.current.isLoadingCategories).toBe(false)); await act(async () => result.current.confirm()); expect(mockNavigate).toHaveBeenCalledWith('Location'); expect(useRegistrationFlow.getState().currentStep).toBe(4); });
it('bloqueia categoria inválida', async () => { useRegistrationFlow.getState().setEditedCategory('invalid'); const { result } = await renderHook(() => useOccurrenceReviewViewModel()); await waitFor(() => expect(result.current.isLoadingCategories).toBe(false)); await act(async () => result.current.confirm()); expect(result.current.categoryError).toContain('ativa'); expect(mockNavigate).not.toHaveBeenCalledWith('Location'); }); });
