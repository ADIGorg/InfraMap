import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NewOccurrenceStackParamList } from './types';
import { CaptureEvidenceScreen } from '@/features/registration/screens/capture-evidence-screen';
import { AiAnalysisScreen } from '@/features/registration/screens/ai-analysis-screen';
import { OccurrenceReviewScreen } from '@/features/registration/screens/occurrence-review-screen';
import { OccurrenceLocationScreen } from '@/features/registration/screens/occurrence-location-screen';
import { OccurrenceSuccessScreen } from '@/features/registration/screens/occurrence-success-screen';

const Stack = createNativeStackNavigator<NewOccurrenceStackParamList>();

export function NewOccurrenceStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen
        name="CaptureEvidence"
        component={CaptureEvidenceScreen}
      />
      <Stack.Screen name="Analysis" component={AiAnalysisScreen} />
      <Stack.Screen name="Review" component={OccurrenceReviewScreen} />
      <Stack.Screen name="Location" component={OccurrenceLocationScreen} />
      <Stack.Screen
        name="Success"
        component={OccurrenceSuccessScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
