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
    expect(screen.getByText("10-ene \u00b7 7 a\u00f1os")).toBeInTheDocument();
    expect(screen.getByText("MARTINA ROJAS")).toBeInTheDocument();
    expect(screen.getByText("Faltan 2 d\u00edas")).toBeInTheDocument();
    expect(screen.queryByText("ALUMNO SIN FECHA")).not.toBeInTheDocument();
  });

  it("muestra estado vacio cuando ningun alumno tiene fecha", () => {
    render(<BirthdaySection alumnos={[]} today={new Date(2026, 0, 10)} />);

    expect(screen.getByText(/Agrega la fecha de nacimiento/i)).toBeInTheDocument();
  });

  it("usa una paleta amplia para evitar bloques de un solo color", () => {
    const manyBirthdays = Array.from({ length: 12 }, (_, index) => ({
      alumnoId: index + 10,
      codigo: `AL-${index + 10}`,
      nombre: `ALUMNO ${index + 1}`,
      curso: "1A",
      fechaNacimiento: `2016-02-${String(index + 1).padStart(2, "0")}`,
      genero: "OTROS",
      activo: true,
    }));

    const { container } = render(<BirthdaySection alumnos={manyBirthdays} today={new Date(2026, 0, 10)} maxItems={0} />);

    expect(container.querySelector(".birthday-card.is-tone-10")).toBeInTheDocument();
  });
});
