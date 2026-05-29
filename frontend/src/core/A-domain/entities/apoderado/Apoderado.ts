// domain/entities/Apoderado.ts
export interface Apoderado {
  id: number;
  codigo?: string;
  nombre: string;
  email: string;
  telefono: string;
  observaciones?: string;
}

export type CreateApoderadoDTO = Omit<Apoderado, "id">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
