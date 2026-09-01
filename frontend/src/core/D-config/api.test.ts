import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  it("mantiene el hostname loopback usado por la pagina", () => {
    expect(resolveApiBaseUrl(
      "http://localhost:5055/tesoreria/api/v1",
      "127.0.0.1",
    )).toBe("http://127.0.0.1:5055/tesoreria/api/v1");
  });

  it("no cambia URLs de produccion", () => {
    expect(resolveApiBaseUrl(
      "https://api.tesoreriaescolar.app/tesoreria/api/v1",
      "tesoreriaescolar.app",
    )).toBe("https://api.tesoreriaescolar.app/tesoreria/api/v1");
  });
});
