import { apiClient } from "@/core/D-config/api";
import type {
  AlumnoApoderado,
  CreateFamiliaDTO,
  Familia,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";
import type { IFamiliaRepository } from "@/core/A-domain/repository/familia/IFamiliaRepository";

export class FamiliaRepositoryImpl implements IFamiliaRepository {
  private readonly baseUrl = "/alumnos";

  async vincular(alumnoId: number, familia: CreateFamiliaDTO): Promise<Familia> {
    const response = await apiClient.post<Familia>(
      `${this.baseUrl}/${alumnoId}/apoderados`,
      familia,
    );
    return response.data;
  }

  async listarPorAlumno(alumnoId: number): Promise<AlumnoApoderado[]> {
    const response = await apiClient.get<AlumnoApoderado[]>(
      `${this.baseUrl}/${alumnoId}/apoderados`,
    );
    return response.data;
  }

  async actualizar(
    alumnoId: number,
    apoderadoId: number,
    familia: UpdateFamiliaDTO,
  ): Promise<Familia> {
    const response = await apiClient.put<Familia>(
      `${this.baseUrl}/${alumnoId}/apoderados/${apoderadoId}`,
      familia,
    );
    return response.data;
  }

  async eliminar(alumnoId: number, apoderadoId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${alumnoId}/apoderados/${apoderadoId}`);
  }
}
