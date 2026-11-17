import React from 'react';
import { PublicMapScreen } from './public-map-screen';

// Reutiliza o mesmo componente. A diferença é que esta tela é registrada
// no AuthStack (visitante), enquanto a outra fica no AppTabs (autenticado).
// O comportamento do mapa é idêntico; a tab bar só existe no AppTabs.
export function PublicMapGuestScreen() {
  return <PublicMapScreen />;
}