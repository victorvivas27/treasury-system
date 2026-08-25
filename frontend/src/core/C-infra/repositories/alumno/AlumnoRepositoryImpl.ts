import { apiClient } from "@/core/D-config/api";
import type {
  Alumno,
  CreateAlumnoDTO,
  PageResponse,
} from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class AlumnoRepositoryImpl implements IAlumnoRepository {
  private readonly baseUrl = "/alumnos";

  async getAll(page: number, size: number, search = ""): Promise<PageResponse<Alumno>> {
    const response = await apiClient.get<PageResponse<Alumno>>(this.baseUrl, {
      params: { page, size, ...(search.trim() && { search: search.trim() }) }
    });
    return response.data;
  }

  async getByCodigo(codigo: string): Promise<Alumno | null> {
    const response = await apiClient.get<Alumno>(`${this.baseUrl}/${codigo}`);
    return response.data;
  }

  async getById(alumnoId: number): Promise<Alumno | null> {
    return this.getByCodigo(String(alumnoId));
  }

  async create(alumno: CreateAlumnoDTO): Promise<Alumno> {
    const response = await apiClient.post<Alumno>(this.baseUrl, alumno);
    return response.data;
  }

  async updateByCodigo(codigo: string, alumno: Partial<Alumno>): Promise<Alumno> {
    const response = await apiClient.put<Alumno>(
      `${this.baseUrl}/${codigo}`,
      alumno,
    );
    return response.data;
  }

  async update(alumnoId: number, alumno: Partial<Alumno>): Promise<Alumno> {
    return this.updateByCodigo(String(alumnoId), alumno);
  }

  async deleteByCodigo(codigo: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${codigo}`);
  }

  async delete(alumnoId: number): Promise<void> {
    await this.deleteByCodigo(String(alumnoId));
  }

  async changeStatus(codigo: string, activo: boolean): Promise<Alumno> {
    return (await apiClient.patch<Alumno>(`${this.baseUrl}/${codigo}/estado`, { activo })).data;
  }
}
