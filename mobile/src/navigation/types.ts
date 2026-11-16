export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };   // ← NOVO
  PublicMap: undefined;
};

export type AppTabsParamList = {
  Map: undefined;
  MyOccurrences: undefined;
  Profile: undefined;
  Notifications: undefined;
};