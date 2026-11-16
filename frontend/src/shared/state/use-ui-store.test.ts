import { describe, expect, it } from 'vitest';
import { useUiStore } from './use-ui-store';

describe('useUiStore', () => {
  it('limpa estado compartilhado no logout/troca de conta', () => {
    useUiStore.getState().setMobileNavOpen(true);
    useUiStore.getState().openModal('reject', 'occurrence-1');
    expect(useUiStore.getState().activeOccurrenceId).toBe('occurrence-1');
    useUiStore.getState().reset();
    expect(useUiStore.getState().isMobileNavOpen).toBe(false);
    expect(useUiStore.getState().activeModal).toBeNull();
    expect(useUiStore.getState().activeOccurrenceId).toBeNull();
  });
});
