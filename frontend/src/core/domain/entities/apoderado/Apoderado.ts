// domain/entities/Apoderado.ts
export interface Apoderado {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  observaciones?: string;
}

export type CreateApoderadoDTO = Omit<Apoderado, "id">;

