// domain/entities/Apoderado.ts
export interface Apoderado {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  observaciones?: string; // ← Opcional, porque en tu ejemplo viene
}
// DTO para crear (sin id)
export type CreateApoderadoDTO = Omit<Apoderado, "id">;
// Resultado: { nombre: string;email: string; telefono: string; }
