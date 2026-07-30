import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { ProfilePage } from "./ProfilePage";

vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1, code: "USR-001", nombre: "Juan Díaz", correo: "juandiaz@mail.com",
        rol: "USER", enabled: true, accountNonLocked: true, createdAt: "", updatedAt: "",
      },
      loading: false,
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
  });

  afterEach(() => vi.clearAllMocks());

  const renderProfile = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);

  it("[ProfilePage #01] muestra la identidad y las métricas del perfil", () => {
    renderProfile();
    expect(screen.getByRole("heading", { name: "Juan Díaz" })).toBeInTheDocument();
    expect(screen.getByText("@juandiaz")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("[ProfilePage #02] cambia entre proyectos y guardados", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("tab", { name: "Guardados" }));
    expect(screen.getByRole("tab", { name: "Guardados" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Presupuesto 2026")).toBeInTheDocument();
    expect(screen.queryByText("Control de cuotas")).not.toBeInTheDocument();
  });

  it("[ProfilePage #03] permite editar el perfil y confirma el guardado", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Editar Perfil" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
    fireEvent.change(within(dialog).getByLabelText("@usuario"), { target: { value: "@anaperez" } });
    fireEvent.change(within(dialog).getByLabelText("Bio"), { target: { value: "Nueva biografía" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("@anaperez")).toBeInTheDocument();
    expect(screen.getByText("Nueva biografía")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Perfil actualizado correctamente");
  });
});
