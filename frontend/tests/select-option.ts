import { fireEvent, screen } from '@testing-library/react';

export function selectOption(trigger: HTMLElement, value: string) {
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const option = screen.getAllByRole('option').find(item => item.dataset.value === value);
  if (!option) throw new Error(`Opção não encontrada: ${value}`);
  fireEvent.click(option);
}
