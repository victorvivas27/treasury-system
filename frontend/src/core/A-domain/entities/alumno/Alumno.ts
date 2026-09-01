export interface Alumno {
  alumnoId: number;
  codigo: string;
  nombre: string;
  curso: string;
  observacion?: string | null;
  fechaNacimiento?: string | null;
  genero: "MASCULINO" | "FEMENINO" | "OTROS";
  activo: boolean;
}

export type CreateAlumnoDTO = Omit<Alumno, "alumnoId" | "codigo" | "activo">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
