import { useState } from "react";
import { useResource } from "../../shared/useResource";
import { deleteProfile, getProfile, logout, updateProfile, updatePassword } from "./profileApi";
export function useProfileViewModel() {
  const resource = useResource(getProfile);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordEditing, setPasswordEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  function edit() {
    setName(resource.data?.data.name ?? "");
    setPhone(resource.data?.data.phone ?? "");
    setMessage("");
    setEditing(true);
  }
  async function perform(action: "save" | "delete" | "logout" | "password") {
    if (busy) return;
    if (action === "save" && !name.trim()) { setMessage("Informe seu nome."); return; }
    if (action === "password" && (!password || password !== confirmation)) {
      setMessage("Preencha e confirme a nova senha."); return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (action === "save") {
        await updateProfile(name, phone);
        setEditing(false);
        await resource.reload();
        setMessage("Perfil atualizado.");
      } else if (action === "password") {
        await updatePassword(password);
        setPassword("");
        setConfirmation("");
        setPasswordEditing(false);
        setMessage("Senha atualizada.");
      } else if (action === "delete") await deleteProfile();
      else await logout();
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  return { ...resource, editing, setEditing, name, setName, phone, setPhone, busy, message, edit, perform,
    passwordEditing, setPasswordEditing, password, setPassword, confirmation, setConfirmation };
}
