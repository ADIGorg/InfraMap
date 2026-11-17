import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OccurrenceCard } from './occurrence-card';
import type { MyOccurrenceListItem } from '@/shared/types/api';

const makeItem = (
  overrides: Partial<MyOccurrenceListItem> = {},
): MyOccurrenceListItem => ({
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Vazamento de água',
  status: 'RECEIVED',
  priority: null,
  location: { lat: -23.55, lng: -46.63 },
  photosCount: 1,
  votesCount: 0,
  createdAt: '2026-08-12T10:00:00Z',
  updatedAt: '2026-08-12T10:00:00Z',
  resolvedAt: null,
  ...overrides,
});

describe('OccurrenceCard', () => {
  it('renderiza categoria, data, descrição e status', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <OccurrenceCard occurrence={makeItem()} onPress={onPress} />,
    );
    expect(getByText('Saneamento')).toBeTruthy();
    expect(getByText(/12\/08\/2026/)).toBeTruthy();
    expect(getByText('Vazamento de água')).toBeTruthy();
    expect(getByText('Recebido')).toBeTruthy();
  });

  it('chama onPress com id correto', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(
      <OccurrenceCard occurrence={makeItem({ id: 'abc' })} onPress={onPress} />,
    );
    await fireEvent.press(getByLabelText(/Saneamento/));
    expect(onPress).toHaveBeenCalledWith('abc');
  });

  it.each([
    ['RECEIVED', 'Recebido'],
    ['UNDER_ANALYSIS', 'Em análise'],
    ['CONFIRMED', 'Confirmado'],
    ['IN_SERVICE', 'Em atendimento'],
    ['RESOLVED', 'Resolvido'],
    ['REJECTED', 'Rejeitado'],
  ] as const)('renderiza badge para status %s como "%s"', async (status, label) => {
    const { getByText } = await render(
      <OccurrenceCard occurrence={makeItem({ status })} onPress={jest.fn()} />,
    );
    expect(getByText(label)).toBeTruthy();
  });
});