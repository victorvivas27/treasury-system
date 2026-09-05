export type BoardRole = "PRESIDENTE" | "VICEPRESIDENTE" | "SECRETARIA" | "TESORERO" | "PASTORAL" | "COORDINADOR_DEPORTIVO";

export interface BoardMember {
  id: number;
  electionYear: number;
  role: BoardRole;
  positionNumber: number;
  apoderadoCodigo: string;
  nombre: string;
  email: string;
  profileImageType: "INITIALS" | "PREDEFINED_AVATAR" | "CUSTOM_IMAGE";
  profileImageUrl: string | null;
  userId: number | null;
}
