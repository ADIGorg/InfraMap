import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PublicMapScreen } from './public-map-screen';
import * as usePublicMap from '../view-models/use-public-map';

jest.mock('../view-models/use-public-map', () => ({
  usePublicMapViewModel: jest.fn(),
}));


jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props: any, ref: any) => (
    <View testID="map-view" {...props} />
  ));
  const MockMarker = (props: any) => <View testID="map-marker" {...props} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_GOOGLE: 'google',
  };
});

describe('PublicMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePublicMap.usePublicMapViewModel as jest.Mock).mockReturnValue({
      region: { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.1, longitudeDelta: 0.1 },
      occurrences: [],
      selectedPin: null,
      categoryId: undefined,
      categories: [],
      isLoading: false,
      isLoadingCategories: false,
      error: null,
      locationPermission: 'unknown',
      setCategoryId: jest.fn(),
      onRegionChangeComplete: jest.fn(),
      requestLocation: jest.fn(),
      selectPin: jest.fn(),
      clearFilters: jest.fn(),
    });
  });

  it('renderiza o mapa e o filtro', async () => {
    const { getByTestId, getByText } = await render(<PublicMapScreen />);
    expect(getByTestId('map-view')).toBeTruthy();
    expect(getByText('Mapa de ocorrências')).toBeTruthy();
  });

  it('mostra mensagem de vazio quando não há ocorrências', async () => {
    const { getByText } = await render(<PublicMapScreen />);
    await waitFor(() =>
      expect(getByText('Nenhuma ocorrência nesta área.')).toBeTruthy(),
    );
  });

  it('mostra erro quando API falha', async () => {
    (usePublicMap.usePublicMapViewModel as jest.Mock).mockReturnValue({
      ...usePublicMap.usePublicMapViewModel(),
      error: 'Falha de rede',
      isLoading: false,
    });
    const { getByText } = await render(<PublicMapScreen />);
    await waitFor(() => expect(getByText('Falha de rede')).toBeTruthy());
  });
});