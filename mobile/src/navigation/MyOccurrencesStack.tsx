    import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MyOccurrencesStackParamList } from './types';
import { MyOccurrencesScreen } from '@/features/occurrences/screens/my-occurrences-screen';

const Stack = createNativeStackNavigator<MyOccurrencesStackParamList>();

export function MyOccurrencesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyOccurrencesList" component={MyOccurrencesScreen} />
    </Stack.Navigator>
  );
}