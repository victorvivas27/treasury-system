import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { MemoryRouter } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";
import { SidebarFooter } from "./SidebarFooter";


describe('Sidebar Component', () => {


  const renderWithRouter = (ui: ReactNode, { route = '/' } = {}) => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    );
  };

  it('Llama a onToggleSidebar al hacer clic en el botón', () => {
    const mockToggle = vi.fn();
    renderWithRouter(<Sidebar isSidebarOpen={true} onToggleSidebar={mockToggle} />);

    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('Verifica las rutas de todos los enlaces del SidebarNav', () => {
    renderWithRouter(<SidebarNav />);

    SIDEBAR_LINKS.flatMap(section => section.links).forEach((link) => {
      const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
      expect(anchor).toHaveAttribute('href', link.path);
    });
  });

  it('Gestiona correctamente la clase "sidebar--collapsed" según isSidebarOpen', () => {

    const { container, rerender } = renderWithRouter(<Sidebar isSidebarOpen={false} onToggleSidebar={vi.fn()} />);
    expect(container.querySelector('aside')).toHaveClass('sidebar--collapsed');

    rerender(
      <MemoryRouter>
        <Sidebar isSidebarOpen={true} onToggleSidebar={vi.fn()} />
      </MemoryRouter>
    );
    expect(container.querySelector('aside')).not.toHaveClass('sidebar--collapsed');
  });

  describe('SidebarFooter', () => {
    it('Verifica las rutas del Footer y la información del usuario', () => {
      renderWithRouter(<SidebarFooter />);

      SIDEBAR_FOOTER_LINKS.forEach((link) => {
        const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
        expect(anchor).toHaveAttribute('href', link.path);
      });

      expect(screen.getByText(SIDEBAR_USER_MOCK.name)).toBeInTheDocument();
      expect(screen.getByText(SIDEBAR_USER_MOCK.email)).toBeInTheDocument();
      expect(screen.getByAltText(`Avatar de ${SIDEBAR_USER_MOCK.name}`)).toHaveAttribute('src', SIDEBAR_USER_MOCK.avatar);
    });

    it('Aplica la clase "active" cuando la ruta coincide', () => {
      const testLink = SIDEBAR_FOOTER_LINKS[0];
      renderWithRouter(<SidebarFooter />, { route: testLink.path });

      const activeLink = screen.getByRole('link', { name: new RegExp(testLink.label, 'i') });
      expect(activeLink).toHaveClass('active');
    });

    it('Ejecuta logout al hacer clic (Pendiente)', () => {
      // Aquí irá la lógica cuando implementes el onClick
    });
  });
});


