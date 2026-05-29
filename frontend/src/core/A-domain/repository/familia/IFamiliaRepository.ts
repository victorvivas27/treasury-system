import type {
  AlumnoApoderado,
  CreateFamiliaPorAlumnoDTO,
  CreateFamiliaDTO,
  Familia,
  FamiliaDetalle,
  PageResponse,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";

export interface IFamiliaRepository {
  getAll(page: number, size: number): Promise<PageResponse<FamiliaDetalle>>;

  create(familia: CreateFamiliaDTO): Promise<Familia>;

  update(id: number, familia: UpdateFamiliaDTO): Promise<Familia>;

  delete(id: number): Promise<void>;

  vincular(alumnoId: number, familia: CreateFamiliaPorAlumnoDTO): Promise<Familia>;

  listarPorAlumno(alumnoId: number): Promise<AlumnoApoderado[]>;

  actualizar(
    alumnoId: number,
    apoderadoId: number,
    familia: UpdateFamiliaDTO,
  ): Promise<Familia>;

  eliminar(alumnoId: number, apoderadoId: number): Promise<void>;
}
