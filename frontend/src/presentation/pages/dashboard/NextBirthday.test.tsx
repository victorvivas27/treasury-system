import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextBirthday } from "./NextBirthday";

const { getBirthdays } = vi.hoisted(() => ({ getBirthdays: vi.fn() }));
vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: vi.fn().mockImplementation(function () { return { getBirthdays }; }),
}));

describe("NextBirthday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elige el cumpleaños más cercano al cambiar de año y excluye inactivos y fechas inválidas", async () => {
    getBirthdays.mockResolvedValue([
      { nombre: "Ana", activo: true, fechaNacimiento: "2015-01-02" },
      { nombre: "Luis", activo: true, fechaNacimiento: "2015-12-20" },
      { nombre: "Inactivo", activo: false, fechaNacimiento: "2015-12-31" },
      { nombre: "Sin fecha", activo: true, fechaNacimiento: null },
      { nombre: "Inválido", activo: true, fechaNacimiento: "2015-13-01" },
    ]);
    render(<NextBirthday today={new Date(2026, 11, 30)} />);
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Próximo cumple: Ana · 2 de enero");
    expect(screen.queryByText("Luis")).not.toBeInTheDocument();
  });

  it("incluye todos los alumnos que cumplen hoy", async () => {
    getBirthdays.mockResolvedValue([
      { nombre: "Luis", activo: true, fechaNacimiento: "2015-09-07" },
      { nombre: "Ana", activo: true, fechaNacimiento: "2016-09-07" },
    ]);
    render(<NextBirthday today={new Date(2026, 8, 7)} />);
    expect(await screen.findByText("Ana, Luis")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Hoy cumple: Ana, Luis");
  });

  it("muestra el estado sin fechas registradas", async () => {
    getBirthdays.mockResolvedValue([]);
    render(<NextBirthday />);
    expect(await screen.findByText("Sin cumpleaños registrados.")).toBeInTheDocument();
  });

  it("informa si falla la consulta", async () => {
    getBirthdays.mockRejectedValue(new Error("network"));
    render(<NextBirthday />);
    expect(await screen.findByText("No fue posible cargar el próximo cumpleaños."))
      .toBeInTheDocument();
  });
});
