import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { useArchitectureAccess } from "./useArchitectureAccess";
import type { UserRole } from "@/core/A-domain/entities/user/User";

vi.mock("@/core/D-config/api", () => ({ apiClient: { get: vi.fn() } }));

describe("Acceso a arquitectura", () => {
  it("no consulta para ADMIN/USER y exige permiso del servidor para SUPER_ADMIN", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data:{allowed:true} });
    const { result, rerender } = renderHook(({id,role}:{id?:number;role?:UserRole}) => useArchitectureAccess(id,role),
      {initialProps:{id:7,role:"ADMIN" as UserRole}});
    expect(result.current.allowed).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
    rerender({id:7,role:"SUPER_ADMIN"});
    await waitFor(() => expect(result.current.allowed).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("/admin/architecture/access", expect.objectContaining({signal:expect.any(AbortSignal)}));
    rerender({id:7,role:"USER"});
    expect(result.current.allowed).toBe(false);
  });

  it("no hereda el permiso de otra cuenta y falla cerrado cuando la API falla", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({data:{allowed:true}}).mockRejectedValueOnce(new Error("network"));
    const {result,rerender}=renderHook(({id})=>useArchitectureAccess(id,"SUPER_ADMIN"),{initialProps:{id:7}});
    await waitFor(()=>expect(result.current.allowed).toBe(true));
    rerender({id:8});
    expect(result.current.allowed).toBe(false);
    await waitFor(()=>expect(result.current.error).toBe(true));
    expect(result.current.allowed).toBe(false);
  });
});
