export interface Alumno {
  alumnoId: number;
  codigo: string;
  nombre: string;
  curso: string;
  observacion?: string | null;
}

export type CreateAlumnoDTO = Omit<Alumno, "alumnoId" | "codigo">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
