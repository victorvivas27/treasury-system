import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import type { AxiosInstance } from "axios";
import {
  configureAxiosInterceptors,
  getAccessToken,
  SESSION_EXPIRED_EVENT,
  setCsrfToken,
  setAccessToken,
} from "./axiosInterceptor";

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      isAxiosError: vi.fn((error: unknown) => Boolean(
        error && typeof error === "object" && "isAxiosError" in error,
      )),
    },
  };
});

describe("configureAxiosInterceptors", () => {
  let prepareRequest: (config: { url?: string; headers: Record<string, string> }) => Promise<unknown>;
  let rejectResponse: (error: unknown) => Promise<never>;
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = "treasury_csrf=; Max-Age=0; path=/";
    setAccessToken(null);
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
    setAccessToken("token-nuevo");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: { Authorization: "Bearer token-anterior" } },
    })).rejects.toBeDefined();

    expect(getAccessToken()).toBe("token-nuevo");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("no interpreta un 401 público como expiración de sesión", async () => {
    setAccessToken("token-vigente");

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: {} },
    })).rejects.toBeDefined();

    expect(getAccessToken()).toBe("token-vigente");
  });

  it("cierra la sesión cuando el servidor rechaza la renovación", async () => {
    setAccessToken("token-vigente");
    vi.mocked(axios.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: { Authorization: "Bearer token-vigente" } },
    })).rejects.toBeDefined();

    expect(getAccessToken()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("conserva la sesión si una ruta rechaza el token recién renovado", async () => {
    setAccessToken("token-renovado");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    await expect(rejectResponse({
      response: { status: 401 },
      config: {
        url: "/tesoreria/egresos/1/adjuntos",
        _authRetry: true,
        headers: { Authorization: "Bearer token-renovado" },
      },
    })).rejects.toBeDefined();

    expect(getAccessToken()).toBe("token-renovado");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("conserva la sesión si la renovación falla por red", async () => {
    setAccessToken("token-vigente");
    vi.mocked(axios.post).mockRejectedValue(new Error("red no disponible"));

    await expect(rejectResponse({
      response: { status: 401 },
      config: { headers: { Authorization: "Bearer token-vigente" } },
    })).rejects.toBeDefined();

    expect(getAccessToken()).toBe("token-vigente");
  });

  it("renueva el token y repite una petición protegida antes de cerrar la sesión", async () => {
    setAccessToken("token-vigente");
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: "token-renovado", csrfToken: "csrf-renovado" },
    });
    request.mockResolvedValue({ data: [] });
    const config = {
      url: "/tesoreria/stands",
      headers: { Authorization: "Bearer token-vigente" },
    };

    await rejectResponse({ response: { status: 401 }, config });

    expect(getAccessToken()).toBe("token-renovado");
    expect(sessionStorage.getItem("treasury.auth.csrf")).toBe("csrf-renovado");
    expect(sessionStorage.getItem("treasury.auth.token")).toBeNull();
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

  it("renueva una sesión cuyo access token ya venció", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expiredToken = `header.${payload}.signature`;
    setAccessToken(expiredToken);
    vi.mocked(axios.post).mockResolvedValue({ data: { token: "token-renovado" } });
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);

    const config = await prepareRequest({ url: "/tesoreria/eventos", headers: {} });

    expect(axios.post).toHaveBeenCalledOnce();
    expect(config).toMatchObject({ headers: { Authorization: "Bearer token-renovado" } });
    expect(getAccessToken()).toBe("token-renovado");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("aplica timeout al intento de renovación", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 }));
    const token = `header.${payload}.signature`;
    setAccessToken(token);
    vi.mocked(axios.post).mockResolvedValue({ data: { token: "token-renovado" } });

    await prepareRequest({ url: "/tesoreria/eventos", headers: {} });

    expect(axios.post).toHaveBeenCalledWith(
      "http://api.test/auth/refresh",
      {},
      expect.objectContaining({ timeout: 30000 }),
    );
  });

  it("envia CSRF en refresh y logout leyendo la cookie doble", async () => {
    document.cookie = "treasury_csrf=csrf-value; path=/";

    const refreshConfig = await prepareRequest({ url: "/auth/refresh", headers: {} });
    const logoutConfig = await prepareRequest({ url: "/auth/logout", headers: {} });

    expect(refreshConfig).toMatchObject({ headers: { "X-CSRF-Token": "csrf-value" } });
    expect(logoutConfig).toMatchObject({ headers: { "X-CSRF-Token": "csrf-value" } });
  });

  it("envia CSRF desde sessionStorage cuando la cookie pertenece a otro dominio", async () => {
    setCsrfToken("csrf-persistido");

    const refreshConfig = await prepareRequest({ url: "/auth/refresh", headers: {} });

    expect(refreshConfig).toMatchObject({ headers: { "X-CSRF-Token": "csrf-persistido" } });
  });

  it("comparte un solo refreshPromise para solicitudes concurrentes", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    setAccessToken(`header.${payload}.signature`);
    vi.mocked(axios.post).mockResolvedValue({ data: { token: "token-renovado" } });

    await Promise.all([
      prepareRequest({ url: "/tesoreria/eventos", headers: {} }),
      prepareRequest({ url: "/tesoreria/stands", headers: {} }),
    ]);

    expect(axios.post).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBe("token-renovado");
  });
});
