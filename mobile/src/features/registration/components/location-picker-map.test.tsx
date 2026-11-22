import { fireEvent, render } from '@testing-library/react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import type { Ref } from 'react';
import { LocationPickerMap } from './location-picker-map';

const mockJumpTo = jest.fn();

jest.mock('@maplibre/maplibre-react-native', () => {
  const { createElement, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: React.ComponentProps<typeof View>) => createElement(View, { ...props, testID: 'native-map' }),
    Camera: ({ ref }: { ref: Ref<Pick<CameraRef, 'jumpTo'>> }) => {
      useImperativeHandle(ref, () => ({ jumpTo: mockJumpTo }));
      return null;
    },
  };
});

const initial = { lat: -12.2664, lng: -38.9663 };
const gps = { lat: -12.246183, lng: -38.949762 };

beforeEach(() => {
  mockJumpTo.mockClear();
});

it('centraliza no ponto do GPS após o mapa carregar e ignora o movimento programático', async () => {
  const onChange = jest.fn();
  const ui = await render(<LocationPickerMap coordinate={initial} onChange={onChange} />);
  await ui.rerender(<LocationPickerMap coordinate={gps} onChange={onChange} />);

  expect(mockJumpTo).not.toHaveBeenCalled();
  await fireEvent(ui.getByTestId('native-map'), 'didFinishLoadingMap');
  expect(mockJumpTo).toHaveBeenCalledWith({ center: [gps.lng, gps.lat] });

  await fireEvent(ui.getByTestId('native-map'), 'regionDidChange', {
    nativeEvent: { center: [gps.lng, gps.lat], userInteraction: false },
  });
  expect(onChange).not.toHaveBeenCalled();
});

it('mantém o ponto arrastado e centraliza a câmera ao tocar em outro ponto', async () => {
  const onChange = jest.fn();
  const ui = await render(<LocationPickerMap coordinate={initial} onChange={onChange} />);
  await fireEvent(ui.getByTestId('native-map'), 'didFinishLoadingMap');

  await fireEvent(ui.getByTestId('native-map'), 'regionDidChange', {
    nativeEvent: { center: [gps.lng, gps.lat], userInteraction: true },
  });
  expect(onChange).toHaveBeenLastCalledWith(gps);
  await ui.rerender(<LocationPickerMap coordinate={gps} onChange={onChange} />);
  expect(mockJumpTo).not.toHaveBeenCalled();

  await fireEvent.press(ui.getByTestId('native-map'), {
    nativeEvent: { lngLat: [initial.lng, initial.lat] },
  });
  expect(onChange).toHaveBeenLastCalledWith(initial);
  await ui.rerender(<LocationPickerMap coordinate={initial} onChange={onChange} />);
  expect(mockJumpTo).toHaveBeenCalledWith({ center: [initial.lng, initial.lat] });
});
