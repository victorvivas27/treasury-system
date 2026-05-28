export interface Alumno {
  id: number;
  nombre: string;
  curso: string;
  apoderadoId: number;
}

export type CreateAlumnoDTO = Omit<Alumno, "id">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
