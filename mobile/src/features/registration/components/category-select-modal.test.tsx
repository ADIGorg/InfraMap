import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CategorySelectModal } from './category-select-modal';

it('indica a categoria atual e devolve o ID da opção escolhida', async () => {
  const onSelect = jest.fn();
  const ui = await render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: 32, bottom: 24, left: 0, right: 0 },
        frame: { x: 0, y: 0, width: 360, height: 800 },
      }}
    >
      <CategorySelectModal
        visible
        categories={[
          { id: 'saneamento', code: 'CAT01', name: 'Saneamento e Drenagem' },
          { id: 'outros', code: 'CAT07', name: 'Outros Problemas de Infraestrutura' },
        ]}
        selectedId="outros"
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    </SafeAreaProvider>,
  );

  expect(ui.getByRole('radio', { name: 'Outros Problemas de Infraestrutura', checked: true })).toBeTruthy();
  expect(ui.queryByText('CAT07')).toBeNull();

  await fireEvent.press(ui.getByRole('radio', { name: 'Saneamento e Drenagem' }));
  expect(onSelect).toHaveBeenCalledWith('saneamento');
});
