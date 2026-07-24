
export interface Apoderado {
  apoderadoId: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  observaciones?: string;
}

export type CreateApoderadoDTO = Omit<Apoderado, "apoderadoId" | "codigo">;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
