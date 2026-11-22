import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { PublicMapScreen } from './public-map-screen';
import * as usePublicMap from '../view-models/use-public-map';

jest.mock('../view-models/use-public-map', () => ({
  usePublicMapViewModel: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Mock do nosso wrapper — evita carregar a lib nativa no jsdom
jest.mock('../components/osm-map-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    OSMMapView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'map-view' }, children),
  };
});

jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMarker = ({ children }: any) =>
    React.createElement(View, { testID: 'map-marker' }, children);

  return {
    Marker: MockMarker,
  };
});

function MapSafeArea({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 44, right: 0, bottom: 34, left: 0 }}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}

describe('PublicMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePublicMap.usePublicMapViewModel as jest.Mock).mockReturnValue({
      centerCoordinate: [-46.63, -23.55],
      zoomLevel: 12,
      bbox: undefined,
      occurrences: [],
      selectedPin: null,
      categoryId: undefined,
      categories: [],
      isLoading: false,
      isLoadingCategories: false,
      error: null,
      locationPermission: 'unknown',
      setCategoryId: jest.fn(),
      onRegionDidChange: jest.fn(),
      onRegionChangeComplete: jest.fn(),
      requestLocation: jest.fn(),
      selectPin: jest.fn(),
      clearFilters: jest.fn(),
    });
  });

  it('renderiza o mapa e o filtro', async () => {
    const { getByTestId, getByText } = await render(<PublicMapScreen />, { wrapper: MapSafeArea });
    expect(getByTestId('map-view')).toBeTruthy();
    expect(getByText('Mapa de ocorrências')).toBeTruthy();
  });

  it('mostra mensagem de vazio quando não há ocorrências', async () => {
    const { getByText } = await render(<PublicMapScreen />, { wrapper: MapSafeArea });
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
    const { getByText } = await render(<PublicMapScreen />, { wrapper: MapSafeArea });
    await waitFor(() => expect(getByText('Falha de rede')).toBeTruthy());
  });
});
