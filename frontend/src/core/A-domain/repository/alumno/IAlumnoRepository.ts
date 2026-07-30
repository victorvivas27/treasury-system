import type { Alumno, CreateAlumnoDTO, PageResponse } from "@/core/A-domain/entities/alumno/Alumno";

export interface IAlumnoRepository {
  getAll(page: number, size: number): Promise<PageResponse<Alumno>>;

  create(alumno: CreateAlumnoDTO): Promise<Alumno>;

  getByCodigo(codigo: string): Promise<Alumno | null>;

  updateByCodigo(codigo: string, alumno: Partial<Alumno>): Promise<Alumno>;

  deleteByCodigo(codigo: string): Promise<void>;
}
