
export interface Apoderado {
  apoderadoId: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  observaciones?: string;
  accessStatus?: "SIN_ACCESO" | "INVITACION_PENDIENTE" | "ACTIVO" | "BLOQUEADO";
  activo: boolean;
}

export type CreateApoderadoDTO = Omit<Apoderado, "apoderadoId" | "codigo" | "activo">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
