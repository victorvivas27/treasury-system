import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { UserRepositoryImpl } from "./UserRepositoryImpl";

vi.mock("@/core/D-config/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("UserRepositoryImpl", () => {
  const repository = new UserRepositoryImpl();
  const payload = {
    nombre: "Victor Vivas",
    correo: "user@mail.com",
    password: "Password1!",
    rol: "USER" as const,
  };

  beforeEach(() => vi.clearAllMocks());

  it("[UserService #01] debe listar usuarios con paginación", async () => {
    const page = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });
    await expect(repository.getAll(0, 10)).resolves.toEqual(page);
    expect(apiClient.get).toHaveBeenCalledWith("/users", { params: { page: 0, size: 10 } });
  });

  it("[UserService #02] debe crear usuario", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1 } });
    await repository.create(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/users", payload);
  });

  it("[UserService #03] debe actualizar y eliminar usuario", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 1 } });
    await repository.update(1, payload);
    await repository.delete(1);
    expect(apiClient.put).toHaveBeenCalledWith("/users/1", payload);
    expect(apiClient.delete).toHaveBeenCalledWith("/users/1");
  });

  it("[UserService #04] debe cambiar rol", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 1, rol: "ADMIN" } });
    await repository.changeRole(1, "ADMIN");
    expect(apiClient.patch).toHaveBeenCalledWith("/users/1/rol", { rol: "ADMIN" });
  });
});
