import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseRecoveryLink } from '../services/recovery-link';
import { verifyRecoveryToken } from '../services/auth.service';

export function useConfirmRecoveryViewModel() {
  const navigate = useNavigate();
  const [link] = useState(() => parseRecoveryLink(window.location.hash, window.location.search));
  const [isVerifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(false);

  useEffect(() => {
    // Remove o token_hash do endereço sem consumi-lo; não entra no histórico
    // de navegação nem em parâmetros enviados à API Express.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, []);

  const confirm = async () => {
    if (link.kind !== 'ready' || pendingRef.current) return;
    pendingRef.current = true;
    setVerifying(true);
    setError('');
    try {
      // Só verifica o token depois de um clique humano. Pré-visualizadores
      // de e-mail podem abrir a página sem consumir o código de uso único.
      await verifyRecoveryToken(link.tokenHash);
      navigate('/reset-password', { replace: true, state: { recoveryVerified: true } });
    } catch {
      setError('Este link não está mais válido. Solicite outro e-mail de recuperação.');
    } finally {
      pendingRef.current = false;
      setVerifying(false);
    }
  };

  return {
    isReady: link.kind === 'ready',
    isExpired: link.kind === 'invalid' && link.reason === 'expired',
    isVerifying,
    error,
    confirm,
  };
}
