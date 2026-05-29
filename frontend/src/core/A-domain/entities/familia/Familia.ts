export interface Familia {
  id: number;
  alumnoId: number;
  apoderadoId: number;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export interface FamiliaDetalle extends Familia {
  alumnoCodigo: string;
  alumnoNombre: string;
  alumnoCurso: string;
  apoderadoCodigo: string;
  apoderadoNombre: string;
}

export interface AlumnoApoderado {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export interface CreateFamiliaDTO {
  alumnoId: number;
  apoderadoId: number;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export type CreateFamiliaPorAlumnoDTO = Omit<CreateFamiliaDTO, "alumnoId">;

export type UpdateFamiliaDTO = Omit<CreateFamiliaDTO, "alumnoId" | "apoderadoId">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
