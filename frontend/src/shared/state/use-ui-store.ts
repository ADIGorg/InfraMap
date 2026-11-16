import { create } from 'zustand';

export type ModalKind =
  | 'reject' | 'priority' | 'start-service' | 'adjust-location'
  | 'correct-classification' | 'observation' | 'forward';

interface UiState {
  isMobileNavOpen: boolean;
  activeModal: ModalKind | null;
  activeOccurrenceId: string | null;
  setMobileNavOpen: (value: boolean) => void;
  openModal: (type: ModalKind, id: string) => void;
  closeModal: () => void;
  reset: () => void;
}
const blank = {
  isMobileNavOpen: false,
  activeModal: null,
  activeOccurrenceId: null,
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...blank,
  setMobileNavOpen: (value) => set({ isMobileNavOpen: value }),
  openModal: (type, id) => set({ activeModal: type, activeOccurrenceId: id }),
  closeModal: () => set({ activeModal: null, activeOccurrenceId: null }),
  reset: () => set({ ...blank }),
}));
