import { describe, expect, it } from "vitest";
import { validateTelefono } from "./apoderadoValidation";

describe("validateTelefono", () => {
  it("acepta hasta 15 dígitos", () => {
    expect(validateTelefono("+56912345678")).toBeNull();
    expect(validateTelefono("123")).toBeNull();
  });

  it("informa cuando el teléfono supera 15 dígitos", () => {
    expect(validateTelefono("1234567890123456"))
      .toBe("El teléfono debe tener máximo 15 dígitos");
  });

  it("cuenta solamente los dígitos del teléfono", () => {
    expect(validateTelefono("+12 345 678 901 234 56"))
      .toBe("El teléfono debe tener máximo 15 dígitos");
  });
});
