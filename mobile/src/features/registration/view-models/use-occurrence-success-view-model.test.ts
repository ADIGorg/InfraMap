import { act, renderHook, waitFor, } from '@testing-library/react-native'; 
import { BackHandler } from 'react-native';
import { useRegistrationFlow } from '../models/registration.model';
import {
  formatOccurrenceProtocol,
  isValidOccurrenceId,
  useOccurrenceSuccessViewModel,
} from './use-occurrence-success-view-model';

const VALID_ID = '9b2f4d61-1a2b-4c5d-8e7f-0a1b2c3d4e5f';
const mockResetNavigation = jest.fn();
const mockReplace = jest.fn();
const mockTabNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
let mockOccurrenceId = VALID_ID;

const mockRemoveBackHandler = jest.fn(); 
const mockBackHandlerSubscription = { remove: mockRemoveBackHandler, };

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { occurrenceId: mockOccurrenceId } }),
  useNavigation: () => ({
    reset: mockResetNavigation,
    replace: mockReplace,
    addListener: mockAddListener,
    getParent: () => ({ navigate: mockTabNavigate }),
  }),
}));



describe('helpers de sucesso', () => {
  it('valida UUID e deriva protocolo real', () => {
    expect(isValidOccurrenceId(VALID_ID)).toBe(true);
    expect(formatOccurrenceProtocol(VALID_ID)).toBe('#OC-9B2F');
    expect(formatOccurrenceProtocol('mock-1089')).toBe('');
  });
});

describe('useOccurrenceSuccessViewModel', () => {
  beforeEach(() => { 
    jest.clearAllMocks(); 
    mockOccurrenceId = VALID_ID; 

    jest
      .spyOn(BackHandler, 'addEventListener') 
      .mockReturnValue(mockBackHandlerSubscription); 

    useRegistrationFlow.getState().reset(); 
    useRegistrationFlow.getState().setCurrentStep(5); 
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('limpa o draft apenas com ID confirmado', async () => {
    const resetSpy = jest.spyOn(useRegistrationFlow.getState(), 'reset');
    const { result } = await renderHook(() =>
      useOccurrenceSuccessViewModel(),
    );

    await waitFor(() => expect(result.current.isConfirmed).toBe(true));
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('ID inválido não limpa draft nem mostra sucesso', async () => {
    mockOccurrenceId = 'invalid-id';
    useRegistrationFlow.getState().setCurrentStep(5);
    const { result } = await renderHook(() =>
      useOccurrenceSuccessViewModel(),
    );

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.protocol).toBe('');
    expect(useRegistrationFlow.getState().currentStep).toBe(5);
  });

  it('navega para Minhas ocorrências sem novo envio', async () => {
    const { result } = await renderHook(() =>
      useOccurrenceSuccessViewModel(),
    );

    await act(async () => {
      result.current.viewMyOccurrences();
    });

    expect(mockResetNavigation).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'CaptureEvidence' }],
    });
    expect(mockTabNavigate).toHaveBeenCalledWith('MyOccurrences', {
      screen: 'MyOccurrencesList',
    });
  });

  it('navega para o mapa', async () => {
    const { result } = await renderHook(() =>
      useOccurrenceSuccessViewModel(),
    );

    await act(async () => {
      result.current.returnToMap();
    });

    expect(mockTabNavigate).toHaveBeenCalledWith('Map', {
      screen: 'PublicMap',
    });
  });
});
