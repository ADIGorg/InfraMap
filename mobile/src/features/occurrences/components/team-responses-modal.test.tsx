import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getTeamResponses } from '../services/team-responses.service';
import { TeamResponsesModal } from './team-responses-modal';

jest.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({ session: { user: { id: 'citizen-1' } } }),
}));

jest.mock('../services/team-responses.service');

it('exibe a resposta inteira e permite consultar mensagens anteriores da ocorrência', async () => {
  const openedResponse = {
    id: 'notification-1',
    content: 'A equipe vistoriou o local e confirmou o problema.\nUma nova visita foi programada para concluir o reparo.',
    created_at: '2026-11-22T15:00:00.000Z',
  };
  const previousResponse = {
    id: 'response-2',
    content: 'A ocorrência foi encaminhada para vistoria.',
    created_at: '2026-11-20T14:00:00.000Z',
  };
  jest.mocked(getTeamResponses)
    .mockResolvedValueOnce({ responses: [{ ...openedResponse, id: 'response-1' }], nextOffset: 20 })
    .mockResolvedValueOnce({ responses: [previousResponse], nextOffset: undefined });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const onViewOccurrence = jest.fn();

  const ui = await render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: 32, bottom: 24, left: 0, right: 0 },
        frame: { x: 0, y: 0, width: 360, height: 800 },
      }}
    >
      <QueryClientProvider client={client}>
        <TeamResponsesModal
          occurrenceId="occ-1"
          openedResponse={openedResponse}
          onClose={jest.fn()}
          onViewOccurrence={onViewOccurrence}
        />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );

  const moreButton = await ui.findByRole('button', { name: 'Carregar mais respostas' });
  const messages = ui.getAllByText(openedResponse.content);
  expect(messages).toHaveLength(1);
  expect(messages[0].props.numberOfLines).toBeUndefined();

  await fireEvent.press(moreButton);
  expect(await ui.findByText(previousResponse.content)).toBeTruthy();
  expect(getTeamResponses).toHaveBeenLastCalledWith('occ-1', 20, expect.anything());

  await fireEvent.press(ui.getByRole('button', { name: 'Ver ocorrência' }));
  expect(onViewOccurrence).toHaveBeenCalledTimes(1);
});
