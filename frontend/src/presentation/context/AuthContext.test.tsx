import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { SESSION_EXPIRED_EVENT } from "@/core/D-config/axiosInterceptor";

const loginMock = vi.fn();
const logoutMock = vi.fn();
const meMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/core/C-infra/repositories/auth/AuthRepositoryImpl", () => ({
  AuthRepositoryImpl: vi.fn().mockImplementation(function () {
    return { login: loginMock, logout: logoutMock, me: meMock, refresh: refreshMock, register: vi.fn() };
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
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    refreshMock.mockRejectedValue({ response: { status: 401 } });
  });

  it("[AuthContext #01] debe iniciar sesión y guardar el token", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem("treasury.auth.token")).toBe("jwt");
    expect(JSON.parse(sessionStorage.getItem("treasury.auth.user") ?? "null")).toEqual(user);
  });

  it("[AuthContext #02] debe cerrar sesión y limpiar el estado", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    logoutMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));
    await act(() => result.current.logout());
    await waitFor(() => expect(result.current.user).toBeNull());
    expect(sessionStorage.getItem("treasury.auth.token")).toBeNull();
    expect(sessionStorage.getItem("treasury.auth.user")).toBeNull();
  });

  it("[AuthContext #02b] no debe esperar al backend para cerrar la sesión local", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    logoutMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));

    await act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(sessionStorage.getItem("treasury.auth.token")).toBeNull();
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("treasury.auth.manual-logout")).toBe("true");
  });

  it("[AuthContext #02c] no restaura la cookie después de un logout manual", async () => {
    localStorage.setItem("treasury.auth.manual-logout", "true");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(refreshMock).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("[AuthContext #03] debe cerrar la sesión y avisar cuando expira", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));

    act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));

    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem("treasury.auth.token")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Tu sesión terminó");
    expect(screen.getByRole("button", { name: "Cerrar aviso" })).toBeInTheDocument();
  });
  it("[AuthContext #04] no debe avisar expiración si nunca hubo una sesión activa", () => {
    renderHook(() => useAuth(), { wrapper });

    act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("[AuthContext #05] limpia silenciosamente un token inválido al iniciar", async () => {
    sessionStorage.setItem("treasury.auth.token", "token-viejo");
    meMock.mockRejectedValue({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem("treasury.auth.token")).toBeNull();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("[AuthContext #06] sincroniza un usuario actualizado en la sesión", async () => {
    loginMock.mockResolvedValue({ token: "jwt", tokenType: "Bearer", expiresIn: 100, user });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("admin@mail.com", "Password1!"));

    act(() => result.current.syncUser({ ...user, nombre: "VÍCTOR ANDRÉS VIVAS" }));

    expect(result.current.user?.nombre).toBe("VÍCTOR ANDRÉS VIVAS");
    expect(JSON.parse(sessionStorage.getItem("treasury.auth.user") ?? "null").nombre)
      .toBe("VÍCTOR ANDRÉS VIVAS");
  });

  it("[AuthContext #07] conserva la sesión restaurada ante un fallo temporal de red", async () => {
    sessionStorage.setItem("treasury.auth.token", "token-vigente");
    sessionStorage.setItem("treasury.auth.user", JSON.stringify(user));
    meMock.mockRejectedValue({ code: "ERR_NETWORK" });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    await waitFor(() => expect(meMock).toHaveBeenCalledTimes(1));
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem("treasury.auth.token")).toBe("token-vigente");
  });
});
