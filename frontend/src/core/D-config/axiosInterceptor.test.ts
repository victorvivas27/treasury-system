import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import type { AxiosInstance } from "axios";
import {
  AUTH_TOKEN_KEY,
  configureAxiosInterceptors,
  SESSION_EXPIRED_EVENT,
} from "./axiosInterceptor";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

describe("configureAxiosInterceptors", () => {
  let prepareRequest: (config: { url?: string; headers: Record<string, string> }) => Promise<unknown>;
  let rejectResponse: (error: unknown) => Promise<never>;
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    request = vi.fn();
    const client = {
      defaults: { baseURL: "http://api.test" },
      request,
      interceptors: {
        request: { use: vi.fn((fulfilled) => { prepareRequest = fulfilled; }) },
        response: {
          use: vi.fn((_success, rejected) => {
            rejectResponse = rejected;
          }),
        },
      },
    } as unknown as AxiosInstance;
    configureAxiosInterceptors(client);
  });

  it("no elimina una sesión nueva por un 401 de una petición anterior", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "token-nuevo");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: { Authorization: "Bearer token-anterior" } },
    })).rejects.toBeDefined();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("token-nuevo");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("no interpreta un 401 público como expiración de sesión", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "token-vigente");

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: {} },
    })).rejects.toBeDefined();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("token-vigente");
  });

  it("cierra la sesión cuando falla exactamente el token vigente", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "token-vigente");
    vi.mocked(axios.post).mockRejectedValue(new Error("refresh rechazado"));
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: { Authorization: "Bearer token-vigente" } },
    })).rejects.toBeDefined();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("renueva el token y repite una petición protegida antes de cerrar la sesión", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "token-vigente");
    vi.mocked(axios.post).mockResolvedValue({ data: { token: "token-renovado" } });
    request.mockResolvedValue({ data: [] });
    const config = {
      url: "/tesoreria/stands",
      headers: { Authorization: "Bearer token-vigente" },
    };

    await rejectResponse({ response: { status: 401 }, config });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("token-renovado");
    expect(config.headers.Authorization).toBe("Bearer token-renovado");
    expect(request).toHaveBeenCalledWith(config);
  });

  it("reintenta una sola vez una lectura que falla por red", async () => {
    request.mockResolvedValue({ data: [] });
    const config = { method: "get", url: "/tesoreria/eventos", headers: {} };

    await rejectResponse({ code: "ERR_NETWORK", config });

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(config);
    expect(config).toMatchObject({ _networkRetry: true });

    await expect(rejectResponse({ code: "ERR_NETWORK", config })).rejects.toBeDefined();
    expect(request).toHaveBeenCalledOnce();
  });

  it("no reintenta escrituras aunque fallen por timeout", async () => {
    const config = { method: "post", url: "/tesoreria/stands", headers: {} };

    await expect(rejectResponse({ code: "ECONNABORTED", config })).rejects.toBeDefined();

    expect(request).not.toHaveBeenCalled();
  });

  it("finaliza inmediatamente una sesión cuyo JWT ya venció", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expiredToken = `header.${payload}.signature`;
    localStorage.setItem(AUTH_TOKEN_KEY, expiredToken);
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(prepareRequest({ url: "/tesoreria/eventos", headers: {} }))
      .rejects.toThrow("La sesión expiró");

    expect(axios.post).not.toHaveBeenCalled();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("aplica timeout al intento de renovación", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 }));
    const token = `header.${payload}.signature`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    vi.mocked(axios.post).mockResolvedValue({ data: { token: "token-renovado" } });

    await prepareRequest({ url: "/tesoreria/eventos", headers: {} });

    expect(axios.post).toHaveBeenCalledWith(
      "http://api.test/auth/refresh",
      {},
      expect.objectContaining({ timeout: 30000 }),
    );
  });
});
