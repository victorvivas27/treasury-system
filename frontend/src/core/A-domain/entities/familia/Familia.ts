export interface Familia {
  id: number;
  alumnoId: number;
  apoderadoId: number;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export interface AlumnoApoderado {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export interface CreateFamiliaDTO {
  apoderadoId: number;
  parentesco: string;
  principal: boolean;
  observaciones?: string | null;
}

export type UpdateFamiliaDTO = Omit<CreateFamiliaDTO, "apoderadoId">;
