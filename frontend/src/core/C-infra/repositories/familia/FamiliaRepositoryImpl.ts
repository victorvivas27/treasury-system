import { apiClient } from "@/core/D-config/api";
import type {
  AlumnoApoderado,
  CreateFamiliaPorAlumnoDTO,
  CreateFamiliaDTO,
  Familia,
  FamiliaDetalle,
  PageResponse,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class FamiliaRepositoryImpl implements IFamiliaRepository {
  private readonly alumnosBaseUrl = "/alumnos";
  private readonly familiasBaseUrl = "/familias/alumno-apoderado";

  async getAll(page: number, size: number): Promise<PageResponse<FamiliaDetalle>> {
    const response = await apiClient.get<PageResponse<FamiliaDetalle>>(this.familiasBaseUrl, {
      params: { page, size },
    });
    return response.data;
  }

  async create(familia: CreateFamiliaDTO): Promise<Familia> {
    const response = await apiClient.post<Familia>(this.familiasBaseUrl, familia);
    return response.data;
  }

  async update(id: number, familia: UpdateFamiliaDTO): Promise<Familia> {
    const response = await apiClient.put<Familia>(`${this.familiasBaseUrl}/${id}`, familia);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`${this.familiasBaseUrl}/${id}`);
  }

  async vincular(alumnoId: number, familia: CreateFamiliaPorAlumnoDTO): Promise<Familia> {
    const response = await apiClient.post<Familia>(
      `${this.alumnosBaseUrl}/${alumnoId}/apoderados`,
      familia,
    );
    return response.data;
  }

  async listarPorAlumno(alumnoId: number): Promise<AlumnoApoderado[]> {
    const response = await apiClient.get<AlumnoApoderado[]>(
      `${this.alumnosBaseUrl}/${alumnoId}/apoderados`,
    );
    return response.data;
  }

  async actualizar(
    alumnoId: number,
    apoderadoId: number,
    familia: UpdateFamiliaDTO,
  ): Promise<Familia> {
    const response = await apiClient.put<Familia>(
      `${this.alumnosBaseUrl}/${alumnoId}/apoderados/${apoderadoId}`,
      familia,
    );
    return response.data;
  }

  async eliminar(alumnoId: number, apoderadoId: number): Promise<void> {
    await apiClient.delete(`${this.alumnosBaseUrl}/${alumnoId}/apoderados/${apoderadoId}`);
  }
}
