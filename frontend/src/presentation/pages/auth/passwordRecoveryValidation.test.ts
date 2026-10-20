import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { passwordRecoveryFailure, validateRecoveryEmail } from "./passwordRecoveryValidation";

const failure = (status: number, errors = {}, headers = {}) => new AxiosError("Request failed", undefined,
  undefined, undefined, { status, statusText: "Error", data: { errors }, headers,
    config: { headers: new AxiosHeaders() } });

describe("validateRecoveryEmail", () => {
  it.each(["usuario@example.test", " nombre.apellido+curso@sub.example.cl ", "o'connor@example.test"])
    ("acepta un correo válido: %s", email => expect(validateRecoveryEmail(email)).toBe(""));
  it.each(["", "   "])("exige un correo: %s", email =>
    expect(validateRecoveryEmail(email)).toBe("Ingrese su correo electrónico"));
  it.each(["sin-arroba", "a@@example.cl", "a b@example.cl", ".a@example.cl", "a.@example.cl",
    "a..b@example.cl", "a@-example.cl", "a@example-.cl", "a@example..cl", "a@example", "a@example.123",
    "a,b@example.cl", `${"a".repeat(65)}@example.cl`, `a@${"a".repeat(64)}.cl`])
    ("rechaza un formato inválido: %s", email => expect(validateRecoveryEmail(email)).toBe("Ingrese un correo válido"));
  it("limita la longitud total", () => {
    expect(validateRecoveryEmail(`${"a".repeat(64)}@${[63, 63, 63].map(n => "b".repeat(n)).join(".")}.cl`))
      .toContain("254 caracteres");
  });
});

describe("passwordRecoveryFailure", () => {
  it.each(["ECONNABORTED", "ETIMEDOUT"])("distingue la demora %s", code => {
    expect(passwordRecoveryFailure(new AxiosError("timeout", code)).message).toContain("Revisa tu correo antes de reintentar");
  });
  it("distingue la falta de conexión", () => {
    expect(passwordRecoveryFailure(new AxiosError("Network Error", "ERR_NETWORK")).message).toContain("Revisa tu conexión");
  });
  it.each([400, 422])("asocia los errores %s a sus campos", status => {
    expect(passwordRecoveryFailure(failure(status, { correo: "Corrige el correo", organizationId: "Elige un curso" })))
      .toEqual({ message: "", fields: { email: "Corrige el correo", organization: "Elige un curso" } });
  });
  it("respeta Retry-After en segundos y usa un minuto si falta", () => {
    expect(passwordRecoveryFailure(failure(429, {}, { "retry-after": "12" }), 1000).retryAt).toBe(13_000);
    expect(passwordRecoveryFailure(failure(429), 1000).retryAt).toBe(61_000);
    expect(passwordRecoveryFailure(failure(429, {}, { "retry-after": "inválido" }), 1000).retryAt).toBe(61_000);
    expect(passwordRecoveryFailure(failure(429, {}, { "retry-after": "" }), 1000).retryAt).toBe(61_000);
  });
  it("respeta Retry-After como fecha", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(passwordRecoveryFailure(failure(429, {}, { "Retry-After": "Sun, 18 Oct 2026 12:01:00 GMT" }), now).retryAt)
      .toBe(now + 60_000);
  });
  it.each([408, 504])("distingue la demora HTTP %s", status =>
    expect(passwordRecoveryFailure(failure(status)).message).toContain("tardó demasiado"));
  it("conserva el error de entrega del correo del servidor", () => {
    expect(passwordRecoveryFailure(failure(503, { email: "No fue posible enviar el correo." })).message)
      .toBe("No fue posible enviar el correo.");
  });
  it.each([401, 403, 500, 502, 503])("ofrece un mensaje útil para HTTP %s", status => {
    expect(passwordRecoveryFailure(failure(status)).message).not.toContain("No fue posible procesar la solicitud");
  });
  it("no muestra detalles internos de errores inesperados", () => {
    expect(passwordRecoveryFailure(new Error("internal stack trace")).message)
      .toBe("No fue posible procesar la solicitud. Intenta más tarde.");
  });
});
