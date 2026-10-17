import { useEffect, useState } from "react";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import type { GuardianInvitation } from "@/core/A-domain/entities/apoderado/GuardianInvitation";
export function useGuardianInvitation(codigo?: string) {
 const [invitation, setInvitation] = useState<GuardianInvitation | null>(null);
 const [error, setError] = useState("");
 const [refresh, setRefresh] = useState(0);
 useEffect(() => {
  let active = true;
  setInvitation(null); setError("");
  if (codigo) new ApoderadoRepositoryImpl().invitationStatus(codigo)
   .then(value => { if (active) setInvitation(value); })
   .catch(() => { if (active) setError("No fue posible consultar el estado de WhatsApp."); });
  return () => { active = false; };
 }, [codigo, refresh]);
 return { invitation, error, reload: () => setRefresh(value => value + 1) };
}
