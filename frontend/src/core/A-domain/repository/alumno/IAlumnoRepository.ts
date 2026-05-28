import type { Alumno, CreateAlumnoDTO, PageResponse } from "@/core/A-domain/entities/alumno/Alumno";

export interface IAlumnoRepository {
  getAll(page: number, size: number): Promise<PageResponse<Alumno>>;

  create(alumno: CreateAlumnoDTO): Promise<Alumno>;

  getById(id: number): Promise<Alumno | null>;

  update(id: number, alumno: Partial<Alumno>): Promise<Alumno>;

  delete(id: number): Promise<void>;
}
