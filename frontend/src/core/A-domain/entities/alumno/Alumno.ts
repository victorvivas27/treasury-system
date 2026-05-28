import type { AlumnoApoderado } from "@/core/A-domain/entities/familia/Familia";

export interface Alumno {
  id: number;
  codigo?: string;
  nombre: string;
  curso: string;
  apoderadoId: number;
  apoderados?: AlumnoApoderado[];
}

export type CreateAlumnoDTO = Omit<Alumno, "id">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
