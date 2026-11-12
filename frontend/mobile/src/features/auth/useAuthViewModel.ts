import { useRef, useState } from "react";
import { authenticate, recoverPassword } from "./authApi";

export function useAuthViewModel() {
  const [screen, setScreen] = useState<"welcome" | "login" | "register" | "recover">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  function navigate(next: typeof screen) {
    if (submitting.current) return;
    setScreen(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
  }

  async function submit() {
    if (submitting.current || screen === "welcome") return;
    setError("");
    setMessage("");
    if (!email.trim() || (screen !== "recover" && !password) || (screen === "register" && !name.trim())) {
      setError("Preencha todos os campos.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (screen === "register" && password !== confirmation) {
      setError("As senhas devem ser iguais.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (screen === "recover") {
        await recoverPassword(email);
        setMessage("Se o e-mail estiver cadastrado, você receberá as instruções. Verifique também a caixa de spam.");
      } else setMessage(await authenticate(screen, { name, email, password }));
      setPassword("");
      setConfirmation("");
    } catch (failure) {
      setError(failure instanceof TypeError ? "Confira sua conexão e tente novamente."
        : failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return { screen, navigate, name, setName, email, setEmail, password, setPassword,
    confirmation, setConfirmation, error, message, busy, submit };
}
