import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import {
  AUTH_TOKEN_KEY,
  configureAxiosInterceptors,
  SESSION_EXPIRED_EVENT,
} from "./axiosInterceptor";

describe("configureAxiosInterceptors", () => {
  let rejectResponse: (error: unknown) => Promise<never>;

  beforeEach(() => {
    localStorage.clear();
    const client = {
      interceptors: {
        request: { use: vi.fn() },
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
});
