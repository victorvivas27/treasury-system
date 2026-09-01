import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BirthdaySection } from "../BirthdaySection";

const alumnos: Alumno[] = [
  {
    alumnoId: 1,
    codigo: "AL-1",
    nombre: "MARTINA ROJAS",
    curso: "1A",
    fechaNacimiento: "2015-01-12",
    genero: "FEMENINO",
    activo: true,
  },
  {
    alumnoId: 2,
    codigo: "AL-2",
    nombre: "THEO VIVAS",
    curso: "1A",
    fechaNacimiento: "2019-01-10",
    genero: "MASCULINO",
    activo: true,
  },
  {
    alumnoId: 3,
    codigo: "AL-3",
    nombre: "ALUMNO SIN FECHA",
    curso: "1A",
    fechaNacimiento: null,
    genero: "OTROS",
    activo: true,
  },
];

describe("BirthdaySection", () => {
  it("ordena cumpleanos cercanos y muestra los dias restantes", () => {
    render(<BirthdaySection alumnos={alumnos} today={new Date(2026, 0, 10)} />);

    expect(screen.getByText("Cumplea\u00f1os")).toBeInTheDocument();
    expect(screen.getByText("Pr\u00f3ximos alumnos")).toBeInTheDocument();
    expect(screen.getByText("THEO VIVAS")).toBeInTheDocument();
    expect(screen.getByText("Hoy cumple")).toBeInTheDocument();
    expect(screen.getByText("10-ene · 7 años")).toBeInTheDocument();
    expect(screen.getByText("MARTINA ROJAS")).toBeInTheDocument();
    expect(screen.getByText("Faltan 2 d\u00edas")).toBeInTheDocument();
    expect(screen.queryByText("ALUMNO SIN FECHA")).not.toBeInTheDocument();
  });

  it("muestra estado vacio cuando ningun alumno tiene fecha", () => {
    render(<BirthdaySection alumnos={[]} today={new Date(2026, 0, 10)} />);

    expect(screen.getByText(/Agrega la fecha de nacimiento/i)).toBeInTheDocument();
  });
});
