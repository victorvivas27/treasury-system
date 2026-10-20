import { useEffect, useState } from "react";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import type { GuardianInvitation } from "@/core/A-domain/entities/apoderado/GuardianInvitation";
export function useGuardianInvitation(codigo?: string) {
 const [invitation, setInvitation] = useState<GuardianInvitation | null>(null);
 const [error, setError] = useState("");
 const [refresh, setRefresh] = useState(0);
 const [whatsappEnabled, setWhatsAppEnabled] = useState(false);
 useEffect(() => {
  let active = true;
  setInvitation(null); setError(""); setWhatsAppEnabled(false);
  const repository = new ApoderadoRepositoryImpl();
  if (codigo) repository.invitationChannels()
   .then(async channels => {
    if (!active) return;
    setWhatsAppEnabled(channels.whatsappEnabled === true);
    if (channels.whatsappEnabled === true) {
     const value = await repository.invitationStatus(codigo);
     if (active) setInvitation(value);
    }
   })
   .catch(() => { if (active) setError("No fue posible consultar el estado de WhatsApp."); });
  return () => { active = false; };
 }, [codigo, refresh]);
 return { invitation, error, whatsappEnabled, reload: () => setRefresh(value => value + 1) };
}
