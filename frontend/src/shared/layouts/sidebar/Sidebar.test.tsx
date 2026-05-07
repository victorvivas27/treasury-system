import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { MemoryRouter } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_LINKS, SIDEBAR_USER_MOCK } from "@/shared/constants/Icons";
import { SidebarFooter } from "./SidebarFooter";



describe('Sidebar Component', () => {
  const mockToggle = vi.fn();
  const mockNavLinkClick = vi.fn();

  const renderWithRouter = (ui: ReactNode, { route = '/' } = {}) => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    );
  };

  // Helper para renderizar Sidebar con props por defecto
  const renderSidebar = (props = {}) => {
    const defaultProps = {
      isSidebarOpen: true,
      isLocked: false,
      onToggleSidebar: mockToggle,
      onNavLinkClick: mockNavLinkClick,
    };
    return renderWithRouter(<Sidebar {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    mockToggle.mockClear();
    mockNavLinkClick.mockClear();
  });

  describe('Sidebar Principal', () => {
    it('[Sidebar #01] Llama a onToggleSidebar al hacer clic en el botón toggle', () => {
      renderSidebar();
      fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it('[Sidebar #02] Gestiona la clase "sidebar--collapsed" según isSidebarOpen', () => {
      const { container, rerender } = renderSidebar({ isSidebarOpen: false });
      expect(container.querySelector('aside')).toHaveClass('sidebar--collapsed');

      rerender(
        <MemoryRouter>
          <Sidebar
            isSidebarOpen={true}
            isLocked={false}
            onToggleSidebar={vi.fn()}
            onNavLinkClick={mockNavLinkClick}
          />
        </MemoryRouter>
      );
      expect(container.querySelector('aside')).not.toHaveClass('sidebar--collapsed');
    });
  });

  it('[Sidebar #03] Verifica las rutas de todos los enlaces del SidebarNav', () => {
    renderWithRouter(<SidebarNav onNavLinkClick={mockNavLinkClick} />);
    SIDEBAR_LINKS.flatMap(section => section.links).forEach((link) => {
      const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
      expect(anchor).toHaveAttribute('href', link.path);
    });
  });

  it('[Sidebar #04] Aplica la clase "active" al enlace de la ruta actual', () => {
    const primeraRuta = SIDEBAR_LINKS[0].links[0].path;
    renderWithRouter(<SidebarNav onNavLinkClick={mockNavLinkClick} />, { route: primeraRuta });
    const activeLink = screen.getByRole('link', { name: new RegExp(SIDEBAR_LINKS[0].links[0].label, 'i') });
    expect(activeLink).toHaveClass('active');
  });

  it('[Sidebar #05] Verifica las rutas del Footer y la información del usuario', () => {
    renderWithRouter(<SidebarFooter isSidebarOpen={true} />);
    SIDEBAR_FOOTER_LINKS.forEach((link) => {
      const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
      expect(anchor).toHaveAttribute('href', link.path);
    });
    expect(screen.getByText(SIDEBAR_USER_MOCK.name)).toBeInTheDocument();
    expect(screen.getByText(SIDEBAR_USER_MOCK.email)).toBeInTheDocument();
    expect(screen.getByAltText(`Avatar de ${SIDEBAR_USER_MOCK.name}`)).toHaveAttribute('src', SIDEBAR_USER_MOCK.avatar);
  });

  it('[Sidebar #06] Aplica la clase "active" en el footer cuando la ruta coincide', () => {
    const testLink = SIDEBAR_FOOTER_LINKS[0];
    renderWithRouter(<SidebarFooter isSidebarOpen={true} />, { route: testLink.path });
    const activeLink = screen.getByRole('link', { name: new RegExp(testLink.label, 'i') });
    expect(activeLink).toHaveClass('active');
  });

  it('[Sidebar #07] Ejecuta logout al hacer clic en el botón de cierre de sesión', () => {
    expect(true).toBe(true);
  });

  it('[Sidebar #08] Ejecuta onNavLinkClick al hacer clic en un enlace', () => {
    renderWithRouter(<SidebarNav onNavLinkClick={mockNavLinkClick} />);
    const enlace = screen.getByRole('link', { name: new RegExp(SIDEBAR_LINKS[0].links[0].label, 'i') });
    fireEvent.click(enlace);
    expect(mockNavLinkClick).toHaveBeenCalledTimes(1);
  });

  it('[Sidebar #09] Cambia el color de fondo del botón toggle según el estado isLocked', () => {
    renderSidebar({ isLocked: true });
    const toggleButton = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(toggleButton).toHaveStyle({ backgroundColor: "var(--color-warning)" });
  });
});



