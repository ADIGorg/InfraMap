import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { changeRecoveredPassword } from '../services/auth.service';
import { ResetPasswordPage } from './reset-password-page';

vi.mock('../services/auth.service', () => ({ changeRecoveredPassword: vi.fn() }));

function renderReset(verified: boolean) {
  const entry = verified
    ? { pathname: '/reset-password', state: { recoveryVerified: true } }
    : { pathname: '/reset-password' };
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => { vi.mocked(changeRecoveredPassword).mockResolvedValue(undefined); });

  it('sem confirmação, não oferece campos para alteração', () => {
    renderReset(false);
    expect(screen.getByRole('alert')).toHaveTextContent('não foi confirmada');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(changeRecoveredPassword).not.toHaveBeenCalled();
  });

  it('valida confirmação e salva apenas depois da verificação', async () => {
    renderReset(true);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-segura-456' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha-segura-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Senha atualizada com sucesso');
    expect(changeRecoveredPassword).toHaveBeenCalledWith('senha-segura-456');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('falha de gravação não mostra sucesso e permite tentar novamente', async () => {
    vi.mocked(changeRecoveredPassword).mockRejectedValue(new Error('recovery expired'));
    renderReset(true);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-segura-456' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha-segura-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar');
    expect(screen.queryByText('Senha atualizada com sucesso.')).not.toBeInTheDocument();
  });
});

