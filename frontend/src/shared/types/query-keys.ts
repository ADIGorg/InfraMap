export const queryKeys = {
  adminMe: ['admin', 'me'] as const,
  adminProfile: ['admin', 'account-profile'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  occurrences: ['admin', 'occurrences'] as const,
  occurrence: (id: string) => ['admin', 'occurrences', id] as const,
  forwardingReplies: (occurrenceId: string, forwardingId: string) =>
    ['admin', 'occurrences', occurrenceId, 'forwardings', forwardingId, 'messages'] as const,
  agencies: ['admin', 'agencies'] as const,
  administrators: ['admin', 'admins'] as const,
} as const;
