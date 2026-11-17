import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OccurrencePreviewSheet } from './occurrence-preview-sheet';
import type { PublicOccurrenceListItem } from '@/shared/types/api';

const mockOccurrence: PublicOccurrenceListItem = {
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Vazamento de água na via',
  status: 'CONFIRMED',
  location: { lat: -23.55, lng: -46.63 },
  votesCount: 10,
  createdAt: new Date().toISOString(),
};

describe('OccurrencePreviewSheet', () => {
  it('não renderiza quando occurrence é null', async () => {
    const { queryByText } = await render(
      <OccurrencePreviewSheet
        occurrence={null}
        onClose={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );
    expect(queryByText('Saneamento')).toBeNull();
  });

  it('renderiza conteúdo quando occurrence existe', async () => {
    const { getByText } = await render(
      <OccurrencePreviewSheet
        occurrence={mockOccurrence}
        onClose={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );
    expect(getByText('Saneamento')).toBeTruthy();
    expect(getByText('Confirmada')).toBeTruthy();
    expect(getByText('Localização aproximada')).toBeTruthy();
    expect(getByText('Vazamento de água na via')).toBeTruthy();
    expect(getByText('10 votos')).toBeTruthy();
  });

  it('não exibe coordenadas exatas', async () => {
    const { queryByText } = await render(
      <OccurrencePreviewSheet
        occurrence={mockOccurrence}
        onClose={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );
    expect(queryByText(/-23\.55/)).toBeNull();
    expect(queryByText(/-46\.63/)).toBeNull();
  });

  it('botão Ver detalhes chama onViewDetails com id correto', async () => {
    const onViewDetails = jest.fn();
    const onClose = jest.fn();
    const { getByText } = await render(
      <OccurrencePreviewSheet
        occurrence={mockOccurrence}
        onClose={onClose}
        onViewDetails={onViewDetails}
      />,
    );

    await fireEvent.press(getByText('Ver detalhes'));

    await waitFor(() => {
      expect(onViewDetails).toHaveBeenCalledWith('occ-1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('botão fechar chama onClose', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await render(
      <OccurrencePreviewSheet
        occurrence={mockOccurrence}
        onClose={onClose}
        onViewDetails={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('Fechar'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('troca de pin: novo occurrence re-renderiza com conteúdo atualizado', async () => {
    const { rerender, getByText } = await render(
      <OccurrencePreviewSheet
        occurrence={mockOccurrence}
        onClose={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );
    expect(getByText('Saneamento')).toBeTruthy();

    const otherOccurrence: PublicOccurrenceListItem = {
      ...mockOccurrence,
      id: 'occ-2',
      category: { id: 'cat-2', code: 'CAT02', name: 'Iluminação' },
      description: 'Poste apagado',
    };

    await rerender(
      <OccurrencePreviewSheet
        occurrence={otherOccurrence}
        onClose={jest.fn()}
        onViewDetails={jest.fn()}
      />,
    );

    expect(getByText('Iluminação')).toBeTruthy();
    expect(getByText('Poste apagado')).toBeTruthy();
  });
});