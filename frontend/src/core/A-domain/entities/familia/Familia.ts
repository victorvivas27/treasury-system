export interface FamiliaApoderadoRelacion {
  parentesco: string;
  esPrincipal: boolean;
}

export interface FamiliaApoderado {
  apoderadoId: number;
  id?: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  relacion: FamiliaApoderadoRelacion;
}

export interface AlumnoFamilia {
  alumnoId: number;
  id?: number;
  codigo: string;
  nombre: string;
}

export interface Familia {
  familiaId: number;
  codigoFamilia: string;
  alumnoId: number;
  observacionesGenerales?: string | null;
  apoderados?: CreateFamiliaApoderadoDTO[];
}

export interface FamiliaDetalle {
  familiaId: number;
  codigoFamilia: string;
  observacionesGenerales?: string | null;
  alumno: AlumnoFamilia;
  apoderados: FamiliaApoderado[];
}

export interface CreateFamiliaApoderadoDTO {
  apoderadoId: number;
  parentesco: string;
  esPrincipal: boolean;
}
export interface CreateFamiliaDTO {
  alumnoId: number;
  observacionesGenerales?: string | null;
  apoderados?: CreateFamiliaApoderadoDTO[];
  apoderadoId?: number;
  parentesco?: string;
  principal?: boolean;
  observaciones?: string | null;
}

export type UpdateFamiliaDTO = Omit<CreateFamiliaDTO, "alumnoId"> & CreateFamiliaDTO;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
