import { apiClient } from "@/core/D-config/api";
import type {
  Alumno,
  CreateAlumnoDTO,
  PageResponse,
} from "@/core/A-domain/entities/alumno/Alumno";
import type { IAlumnoRepository } from "@/core/A-domain/repository/alumno/IAlumnoRepository";

export class AlumnoRepositoryImpl implements IAlumnoRepository {
  private readonly baseUrl = "/alumnos";

  async getAll(page: number, size: number): Promise<PageResponse<Alumno>> {
    const response = await apiClient.get<PageResponse<Alumno>>(this.baseUrl, {
      params: { page, size }
    });
    return response.data;
  }

  async getById(id: number): Promise<Alumno | null> {
    const response = await apiClient.get<Alumno>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(alumno: CreateAlumnoDTO): Promise<Alumno> {
    const response = await apiClient.post<Alumno>(this.baseUrl, alumno);
    return response.data;
  }

  async update(id: number, alumno: Partial<Alumno>): Promise<Alumno> {
    const response = await apiClient.put<Alumno>(
      `${this.baseUrl}/${id}`,
      alumno,
    );
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }
}
