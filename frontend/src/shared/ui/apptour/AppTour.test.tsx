import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/core/A-domain/entities/user/User";
import { AppTour } from "./AppTour";

const admin: User = {
  id: 1,
  code: "USR-001",
  nombre: "Administradora",
  correo: "admin@mail.com",
  rol: "ADMIN",
  enabled: true,
  accountNonLocked: true,
  emailVerifiedAt: null,
  createdAt: "",
  updatedAt: "",
};

describe("AppTour", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it("recorre en orden las áreas administrativas", () => {
    vi.useFakeTimers();
    render(<AppTour user={admin} />);
    act(() => vi.advanceTimersByTime(700));

    const expectedSteps = [
      "¡Bienvenido, Administradora!",
      "Panel principal",
      "Familias",
      "Apoderados",
      "Alumnos",
      "Usuarios",
      "Perfil",
      "Todo listo",
    ];

    expectedSteps.forEach((title, index) => {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(`Recorrido guiado · ${index + 1} de 8`)).toBeInTheDocument();
      if (index < expectedSteps.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      }
    });
  });

});
