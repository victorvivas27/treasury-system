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

    expect(screen.getByRole("heading", { name: "Pr\u00f3ximos cumplea\u00f1os" })).toBeInTheDocument();
    expect(screen.getByText("THEO VIVAS")).toBeInTheDocument();
    expect(screen.getByText("Hoy cumple")).toBeInTheDocument();
    expect(screen.getByLabelText("10 de enero")).toBeInTheDocument();
    expect(screen.getByText("MARTINA ROJAS")).toBeInTheDocument();
    expect(screen.queryByText(/2015|2019|\d+ a\u00f1os|Edad actual|Fecha de nacimiento/)).not.toBeInTheDocument();
    expect(screen.getByText("Faltan 2 d\u00edas")).toBeInTheDocument();
    expect(screen.queryByText("ALUMNO SIN FECHA")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver más/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra estado vacio cuando ningun alumno tiene fecha", () => {
    render(<BirthdaySection alumnos={[]} today={new Date(2026, 0, 10)} />);

    expect(screen.getByText(/Agrega la fecha de nacimiento/i)).toBeInTheDocument();
  });

  it("mantiene variedad de colores e iconos estables y agota la colección antes de repetir", () => {
    const manyBirthdays = Array.from({ length: 28 }, (_, index) => ({
      alumnoId: index + 10,
      codigo: `AL-${index + 10}`,
      nombre: `ALUMNO ${index + 1}`,
      curso: "1A",
      fechaNacimiento: `2016-02-${String(index + 1).padStart(2, "0")}`,
      genero: "OTROS",
      activo: true,
    }));

    const { container, rerender } = render(<BirthdaySection alumnos={manyBirthdays} today={new Date(2026, 0, 10)} maxItems={0} />);

    expect(container.querySelector(".birthday-card.is-tone-10")).toBeInTheDocument();
    const assignments = () => Object.fromEntries([...container.querySelectorAll(".birthday-card")]
      .map(card => [card.querySelector("h3")?.textContent,
        card.querySelector("[data-celebration-icon]")?.getAttribute("data-celebration-icon")]));
    const originalAssignments = assignments();
    const icons = Object.values(originalAssignments);
    expect(icons.every(Boolean)).toBe(true);
    const uniqueCount = new Set(icons).size;
    expect(uniqueCount).toBeGreaterThan(20);
    expect(icons.findIndex((icon, index) => icons.indexOf(icon) < index)).toBe(uniqueCount);

    rerender(<BirthdaySection alumnos={[...manyBirthdays].reverse()} today={new Date(2026, 1, 15)} maxItems={0} />);
    expect(assignments()).toEqual(originalAssignments);
  });
});
