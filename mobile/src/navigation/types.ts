import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
  PublicMap: undefined;
};

export type MapStackParamList = {
  PublicMap: undefined;
};

export type MyOccurrencesStackParamList = {
  MyOccurrencesList: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
};

export type AppTabsParamList = {
  Map: NavigatorScreenParams<MapStackParamList>;
  MyOccurrences: NavigatorScreenParams<MyOccurrencesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
  Notifications: undefined;
  NewOccurrence: NavigatorScreenParams<NewOccurrenceStackParamList>;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  AppTabs: NavigatorScreenParams<AppTabsParamList>;
  ResetPassword: undefined;
  PublicOccurrenceDetail: { id: string };
  MyOccurrenceDetail: { id: string };
};

export type NewOccurrenceStackParamList = {
  CaptureEvidence: undefined;
  Analysis: undefined;
  Review: undefined;
  Location: undefined;
  Success: { occurrenceId: string };
};
