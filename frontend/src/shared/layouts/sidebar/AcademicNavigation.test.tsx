import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SidebarNav } from "./SidebarNav";
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({ useArchitectureAccess: () => ({ allowed: false }) }));
describe("Navegación académica", () => {
  it("abre, marca ruta activa, cierra al navegar y reserva evaluaciones sin enlace", () => {
    const navigate = vi.fn();
    render(<MemoryRouter initialEntries={["/calendario/horario-clases"]}><SidebarNav role="USER" onNavLinkClick={navigate} /></MemoryRouter>);
    const menu = screen.getByRole("button", { name: "Calendario Académico" });
    expect(menu).toHaveClass("active");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveAttribute("aria-controls", "academic-submenu");
    const link = screen.getByRole("link", { name: "Horario de clases" });
    expect(link).toHaveClass("active");
    expect(screen.getByText("Evaluaciones · Próximamente").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("link", { name: /Evaluaciones/ })).not.toBeInTheDocument();
    fireEvent.click(link); expect(navigate).toHaveBeenCalledOnce();
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
