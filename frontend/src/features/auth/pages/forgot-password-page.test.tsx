import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { requestPasswordReset } from '../services/auth.service';
import { ForgotPasswordPage } from './forgot-password-page';

vi.mock('../services/auth.service', () => ({ requestPasswordReset: vi.fn() }));

describe('ForgotPasswordPage', () => {
  beforeEach(() => { vi.mocked(requestPasswordReset).mockResolvedValue(undefined); });
  it('solicita link para a tela intermediária, nunca para reset direto', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith(
      'admin@example.com', window.location.origin + '/confirm-recovery',
    ));
    expect(screen.getByRole('status')).toHaveTextContent('Se o e-mail estiver cadastrado');
  });
  it('não revela se o e-mail existe em resposta de falha', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new Error('User not found'));
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'inexistente@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Se o e-mail estiver cadastrado');
    expect(screen.queryByText(/User not found/)).not.toBeInTheDocument();
  });
});

