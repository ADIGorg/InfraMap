import { describe, expect, it } from 'vitest';
import { parseRecoveryLink } from './recovery-link';

const tokenHash = 'a'.repeat(64);

describe('parseRecoveryLink', () => {
  it('aceita apenas token de recuperação no fragmento', () => {
    expect(parseRecoveryLink('#token_hash=' + tokenHash + '&type=recovery')).toEqual({
      kind: 'ready', tokenHash,
    });
  });
  it('identifica link expirado', () => {
    expect(parseRecoveryLink('#error=access_denied&error_code=otp_expired')).toEqual({
      kind: 'invalid', reason: 'expired',
    });
  });
  it('bloqueia tipos diferentes e hashes malformados', () => {
    expect(parseRecoveryLink('#token_hash=' + tokenHash + '&type=signup').kind).toBe('invalid');
    expect(parseRecoveryLink('#token_hash=curto&type=recovery').kind).toBe('invalid');
  });
  it('não aceita parâmetros de autenticação em query e dispensa links ausentes', () => {
    expect(parseRecoveryLink('', '?token_hash=' + tokenHash + '&type=recovery').kind).toBe('invalid');
    expect(parseRecoveryLink('').kind).toBe('invalid');
  });
  it('exibe erro quando Supabase redireciona com query otp_expired', () => {
    expect(parseRecoveryLink('', '?error=access_denied&error_code=otp_expired')).toEqual({
      kind: 'invalid', reason: 'expired',
    });
  });
});

