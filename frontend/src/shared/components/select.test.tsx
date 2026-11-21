import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './select';
import { selectOption } from '../../../tests/select-option';

const options = [{ value: '', label: 'Todas' }, { value: 'HIGH', label: 'Alta' }, { value: 'LOW', label: 'Baixa' }];
describe('Select compartilhado', () => {
  it('abre pelo texto, seleciona e permite voltar à opção vazia sem enviar o valor interno', () => {
    const submit = vi.fn();
    render(<form onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget).get('priority')); }}>
      <label>Prioridade<Select name="priority" options={options} /></label><button type="submit">Aplicar</button>
    </form>);
    const trigger = screen.getByRole('combobox', { name: 'Prioridade' });
    fireEvent.click(within(trigger).getByText('Todas'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Alta' }));
    expect(trigger).toHaveTextContent('Alta');
    fireEvent.click(screen.getByText('Aplicar')); expect(submit).toHaveBeenLastCalledWith('HIGH');
    selectOption(trigger, '');
    fireEvent.click(screen.getByText('Aplicar')); expect(submit).toHaveBeenLastCalledWith('');
  });
  it('mantém as opções abertas até a seleção dentro do modal e Escape fecha apenas o seletor', () => {
    function Example() {
      const [value, setValue] = useState('HIGH');
      return <Dialog.Root defaultOpen><Dialog.Portal><Dialog.Content aria-describedby={undefined}>
        <Dialog.Title>Filtros</Dialog.Title>
        <label>Prioridade<Select value={value} onValueChange={setValue} options={options} /></label>
      </Dialog.Content></Dialog.Portal></Dialog.Root>;
    }
    render(<Example />);
    const trigger = screen.getByRole('combobox', { name: 'Prioridade' });
    selectOption(trigger, 'LOW'); expect(trigger).toHaveTextContent('Baixa');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('respeita campos desabilitados', () => {
    render(<Select aria-label="Prioridade" disabled options={options} />);
    const trigger = screen.getByRole('combobox'); expect(trigger).toBeDisabled();
    fireEvent.click(trigger); expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('permite selecionar pelo teclado e retorna o foco ao campo', async () => {
    render(<label>Prioridade<Select defaultValue="HIGH" options={options} /></label>);
    const trigger = screen.getByRole('combobox', { name: 'Prioridade' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const low = screen.getByRole('option', { name: 'Baixa' });
    low.focus(); fireEvent.keyDown(low, { key: 'Enter' });
    expect(trigger).toHaveTextContent('Baixa');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('não fecha novamente após a sequência de clique do mouse no corpo do campo', () => {
    render(<Select aria-label="Prioridade" options={options} />);
    const trigger = screen.getByRole('combobox');
    const pointer = (target: HTMLElement, type: string) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 30, clientY: 20 });
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      fireEvent(target, event);
    };
    pointer(trigger, 'pointerdown'); pointer(trigger, 'pointerup'); fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const option = screen.getByRole('option', { name: 'Alta' });
    pointer(option, 'pointermove'); pointer(option, 'pointerup');
    expect(trigger).toHaveTextContent('Alta');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
