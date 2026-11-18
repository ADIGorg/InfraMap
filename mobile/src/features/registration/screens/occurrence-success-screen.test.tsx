import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OccurrenceSuccessScreen } from './occurrence-success-screen';
import * as ViewModel from '../view-models/use-occurrence-success-view-model';

jest.mock('../view-models/use-occurrence-success-view-model', () => ({
  useOccurrenceSuccessViewModel: jest.fn(),
}));

const base = {
  occurrenceId: '9b2f4d61-1a2b-4c5d-8e7f-0a1b2c3d4e5f',
  protocol: '#OC-9B2F',
  status: 'RECEIVED',
  statusLabel: 'Recebido',
  isConfirmed: true,
  viewMyOccurrences: jest.fn(),
  returnToMap: jest.fn(),
  returnToLocation: jest.fn(),
};

describe('OccurrenceSuccessScreen', () => {
  it('mostra protocolo real e status Recebido', async () => {
    (ViewModel.useOccurrenceSuccessViewModel as jest.Mock).mockReturnValue(base);
    const ui = await render(<OccurrenceSuccessScreen />);

    expect(ui.getByText('Ocorrência enviada!')).toBeTruthy();
    expect(ui.getByText('#OC-9B2F')).toBeTruthy();
    expect(ui.getByText('Recebido')).toBeTruthy();
    expect(ui.queryByText(/encaminhada/i)).toBeNull();
  });

  it('aciona as duas rotas de saída', async () => {
    const viewMyOccurrences = jest.fn();
    const returnToMap = jest.fn();
    (ViewModel.useOccurrenceSuccessViewModel as jest.Mock).mockReturnValue({
      ...base,
      viewMyOccurrences,
      returnToMap,
    });
    const ui = await render(<OccurrenceSuccessScreen />);

    await fireEvent.press(ui.getByText('Ver minhas ocorrências'));
    await fireEvent.press(ui.getByText('Voltar ao mapa'));

    expect(viewMyOccurrences).toHaveBeenCalledTimes(1);
    expect(returnToMap).toHaveBeenCalledTimes(1);
  });

  it('ID inválido apresenta erro em vez de falso sucesso', async () => {
    (ViewModel.useOccurrenceSuccessViewModel as jest.Mock).mockReturnValue({
      ...base,
      isConfirmed: false,
      protocol: '',
    });
    const ui = await render(<OccurrenceSuccessScreen />);

    expect(ui.getByText('Envio não confirmado')).toBeTruthy();
    expect(ui.queryByText('Ocorrência enviada!')).toBeNull();
  });
});
