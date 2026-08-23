import type { BoardMember, BoardRole } from "@/core/A-domain/entities/community/BoardMember";
import { apiClient } from "@/core/D-config/api";

export const courseBoard = {
  async list(year = new Date().getFullYear()) {
    return (await apiClient.get<BoardMember[]>("/community/board", { params: { year } })).data;
  },
  async assign(role: BoardRole, positionNumber: number, apoderadoCodigo: string,
    electionYear = new Date().getFullYear()) {
    return (await apiClient.put<BoardMember>("/community/board", {
      electionYear, role, positionNumber, apoderadoCodigo,
    })).data;
  },
  async delete(id: number) { await apiClient.delete(`/community/board/${id}`); },
};
