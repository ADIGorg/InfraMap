import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { verifyRecoveryToken } from '../services/auth.service';
import { ConfirmRecoveryPage } from './confirm-recovery-page';

vi.mock('../services/auth.service', () => ({ verifyRecoveryToken: vi.fn() }));

const tokenHash = 'b'.repeat(64);

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/confirm-recovery']}>
      <Routes>
        <Route path="/confirm-recovery" element={<ConfirmRecoveryPage />} />
        <Route path="/reset-password" element={<p>Formulário liberado</p>} />
        <Route path="/forgot-password" element={<p>Solicitar outro link</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConfirmRecoveryPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/confirm-recovery');
  });
  it('visitar o link não consome o OTP; o hash sai da URL', () => {
    window.history.replaceState(null, '', '/confirm-recovery#token_hash=' + tokenHash + '&type=recovery');
    renderFlow();
    expect(screen.getByRole('button', { name: /Continuar recuperação/ })).toBeInTheDocument();
    expect(verifyRecoveryToken).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });
  it('só valida ao clicar e redireciona após confirmação', async () => {
    vi.mocked(verifyRecoveryToken).mockResolvedValue(undefined);
    window.history.replaceState(null, '', '/confirm-recovery#token_hash=' + tokenHash + '&type=recovery');
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Continuar recuperação/ }));
    await waitFor(() => expect(verifyRecoveryToken).toHaveBeenCalledWith(tokenHash));
    expect(await screen.findByText('Formulário liberado')).toBeInTheDocument();
  });
  it('um link expirado não mostra botão para validar', () => {
    window.history.replaceState(null, '', '/confirm-recovery#error=access_denied&error_code=otp_expired');
    renderFlow();
    expect(screen.getByRole('alert')).toHaveTextContent('expirou');
    expect(screen.queryByRole('button', { name: /Continuar recuperação/ })).not.toBeInTheDocument();
    expect(verifyRecoveryToken).not.toHaveBeenCalled();
  });
  it('falha de verificação informa necessidade de novo link sem liberar formulário', async () => {
    vi.mocked(verifyRecoveryToken).mockRejectedValue(new Error('token expired'));
    window.history.replaceState(null, '', '/confirm-recovery#token_hash=' + tokenHash + '&type=recovery');
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /Continuar recuperação/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Solicite outro');
    expect(screen.queryByText('Formulário liberado')).not.toBeInTheDocument();
  });
});

