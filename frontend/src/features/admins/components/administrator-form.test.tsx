import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdministratorForm } from './administrator-form';
import { selectOption } from '../../../../tests/select-option';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));

describe('Perfil de acesso no cadastro de administrador', () => {
  it('envia o perfil selecionado e restaura o padrão após cadastrar', async () => {
    const create = vi.fn(async () => true);
    render(<AdministratorForm disabled={false} onCreate={create} />);
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Administrador Teste' } });
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha inicial'), { target: { value: 'senha-de-teste-123' } });
    selectOption(screen.getByRole('combobox', { name: 'Perfil de acesso' }), 'MASTER');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar administrador' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ admin_level: 'MASTER' })));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Perfil de acesso' })).toHaveTextContent('Operacional'));
    expect(screen.getByLabelText('Senha inicial')).toHaveValue('');
  });
  it('desabilita o seletor quando o cadastro está bloqueado', () => {
    render(<AdministratorForm disabled onCreate={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Perfil de acesso' })).toBeDisabled();
  });
});
