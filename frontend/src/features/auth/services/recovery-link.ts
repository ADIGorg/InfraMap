export type RecoveryLink =
  | { kind: 'ready'; tokenHash: string }
  | { kind: 'invalid'; reason: 'missing' | 'expired' | 'malformed' };

export function parseRecoveryLink(hash: string, search = ''): RecoveryLink {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search.replace(/^\?/, ''));
  const errorCode = fragment.get('error_code') || query.get('error_code');
  if (errorCode === 'otp_expired') return { kind: 'invalid', reason: 'expired' };
  if (fragment.has('error') || query.has('error')) return { kind: 'invalid', reason: 'malformed' };

  const tokenHash = fragment.get('token_hash');
  const type = fragment.get('type');
  if (!tokenHash || !type) return { kind: 'invalid', reason: 'missing' };
  if (type !== 'recovery' || !/^[a-zA-Z0-9_-]{20,256}$/.test(tokenHash)) {
    return { kind: 'invalid', reason: 'malformed' };
  }
  return { kind: 'ready', tokenHash };
}
