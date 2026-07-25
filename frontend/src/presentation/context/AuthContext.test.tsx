import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";

const loginMock = vi.fn();
const logoutMock = vi.fn();
const meMock = vi.fn();

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: vi.fn().mockImplementation(function () {
    return { login: loginMock, logout: logoutMock, me: meMock, refresh: vi.fn(), register: vi.fn() };
  }),
}));

const user = {
  id: 1,
  code: "USR-001",
  nombre: "VICTOR VIVAS",
  correo: "admin@mail.com",
  rol: "ADMIN" as const,
  enabled: true,
  accountNonLocked: true,
  createdAt: "",
  updatedAt: "",
};

describe("AuthContext", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("[AuthContext #01] debe iniciar sesión y guardar el token", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("treasury.auth.token")).toBe("jwt");
  });

  it("[AuthContext #02] debe cerrar sesión y limpiar el estado", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    logoutMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));
    await act(() => result.current.logout());
    await waitFor(() => expect(result.current.user).toBeNull());
    expect(localStorage.getItem("treasury.auth.token")).toBeNull();
  });
});
