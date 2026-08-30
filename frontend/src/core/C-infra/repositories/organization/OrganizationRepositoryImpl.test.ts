import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { OrganizationRepositoryImpl } from "./OrganizationRepositoryImpl";

vi.mock("@/core/D-config/api", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("OrganizationRepositoryImpl", () => {
  const repository = new OrganizationRepositoryImpl();

  beforeEach(() => vi.clearAllMocks());

  it("lists organizations and their administrators", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: [{ id: 4, name: "4A" }] })
      .mockResolvedValueOnce({ data: [{ id: 9, name: "Ana" }] });

    await expect(repository.getAll()).resolves.toEqual([{ id: 4, name: "4A" }]);
    await expect(repository.getAdmins(4)).resolves.toEqual([{ id: 9, name: "Ana" }]);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/organizations");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/organizations/4/admins");
  });

  it("creates a course, its administrator and changes status", async () => {
    const organization = { name: "4A", slug: "4a", type: "COURSE" as const };
    const admin = { name: "Ana Pérez", email: "ana@mail.cl", password: "Clave1!a" };
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { id: 4, ...organization } })
      .mockResolvedValueOnce({ data: 9 });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 4, active: false } });

    await repository.create(organization);
    await repository.createAdmin(4, admin);
    await repository.setActive(4, false);
    await repository.updateEmailBranding(4, {
      senderName: "Curso 4A", replyToEmail: "admin4a@colegio.cl",
    });
    await repository.updateCourse(4, { name: "5A", schoolYear: 2027 });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/organizations", organization);
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "/organizations/4/admins", admin);
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/organizations/4/active", undefined, { params: { value: false } },
    );
    expect(apiClient.patch).toHaveBeenCalledWith("/organizations/4/email-branding", {
      senderName: "Curso 4A", replyToEmail: "admin4a@colegio.cl",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/organizations/4/course", {
      name: "5A", schoolYear: 2027,
    });
  });

  it("deletes an organization with both confirmations", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

    await repository.delete(4, {
      organizationName: "4A",
      confirmation: "ELIMINAR",
    });

    expect(apiClient.delete).toHaveBeenCalledWith("/organizations/4", {
      data: { organizationName: "4A", confirmation: "ELIMINAR" },
    });
  });
});
