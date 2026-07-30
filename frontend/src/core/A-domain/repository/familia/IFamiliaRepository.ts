import type {
  CreateFamiliaDTO,
  Familia,
  FamiliaDetalle,
  PageResponse,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";

export interface IFamiliaRepository {
  
  getAll(page: number, size: number): Promise<PageResponse<FamiliaDetalle>>;

  getById(familiaId: number): Promise<FamiliaDetalle>;

  create(familia: CreateFamiliaDTO): Promise<Familia>;

  update(familiaId: number, familia: UpdateFamiliaDTO): Promise<Familia>;

  delete(familiaId: number): Promise<void>;
}
