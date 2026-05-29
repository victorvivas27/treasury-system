export interface Alumno {
  id: number;
  codigo?: string;
  nombre: string;
  curso: string;
}

export type CreateAlumnoDTO = Omit<Alumno, "id">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
