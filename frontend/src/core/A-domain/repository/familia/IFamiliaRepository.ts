import type {
  AlumnoApoderado,
  CreateFamiliaDTO,
  Familia,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";

export interface IFamiliaRepository {
  vincular(alumnoId: number, familia: CreateFamiliaDTO): Promise<Familia>;

  listarPorAlumno(alumnoId: number): Promise<AlumnoApoderado[]>;

  actualizar(
    alumnoId: number,
    apoderadoId: number,
    familia: UpdateFamiliaDTO,
  ): Promise<Familia>;

  eliminar(alumnoId: number, apoderadoId: number): Promise<void>;
}
