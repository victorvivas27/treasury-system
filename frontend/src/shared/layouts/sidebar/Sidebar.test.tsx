import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { MemoryRouter } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_LINKS, SIDEBAR_USER_MOCK,
  TREASURY_LINKS } from "@/shared/constants/Icons";
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
    renderWithRouter(
      <SidebarNav role="ADMIN" onNavLinkClick={mockNavLinkClick} />,
    );
    SIDEBAR_LINKS.flatMap(section => section.links).forEach((link) => {
      const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
      expect(anchor).toHaveAttribute('href', link.path);
    });
  });

  it('[Sidebar #04] Aplica la clase "active" al enlace de la ruta actual', () => {
    const primeraRuta = SIDEBAR_LINKS[0].links[0].path;
    renderWithRouter(<SidebarNav role="ADMIN" onNavLinkClick={mockNavLinkClick} />, { route: primeraRuta });
    const activeLink = screen.getByRole('link', { name: new RegExp(SIDEBAR_LINKS[0].links[0].label, 'i') });
    expect(activeLink).toHaveClass('active');
  });

  it('[Sidebar #04.1] Oculta alumnos, apoderados y familia para rol USER', () => {
    renderWithRouter(<SidebarNav role="USER" onNavLinkClick={mockNavLinkClick} />);
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /alumnos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /apoderados/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /familia/i })).not.toBeInTheDocument();
  });

  it('[Sidebar #05] Verifica las rutas del Footer y la información del usuario', () => {
    renderWithRouter(<SidebarFooter isSidebarOpen={true} />);
    SIDEBAR_FOOTER_LINKS.forEach((link) => {
      const anchor = screen.getByRole('link', { name: new RegExp(link.label, 'i') });
      expect(anchor).toHaveAttribute('href', link.path);
    });
    expect(screen.getByText(SIDEBAR_USER_MOCK.name)).toBeInTheDocument();
    expect(screen.getByText(SIDEBAR_USER_MOCK.email)).toBeInTheDocument();
    const profileLink = screen.getByRole('link', { name: `Ver perfil de ${SIDEBAR_USER_MOCK.name}` });
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(profileLink.querySelector('img')).toHaveAttribute('src', SIDEBAR_USER_MOCK.avatar);
    expect(screen.queryByRole('link', { name: /mi perfil/i })).not.toBeInTheDocument();
  });

  it('[Sidebar #06] Aplica la clase "active" en el footer cuando la ruta coincide', () => {
    const testLink = SIDEBAR_FOOTER_LINKS[0];
    renderWithRouter(<SidebarFooter isSidebarOpen={true} />, { route: testLink.path });
    const activeLink = screen.getByRole('link', { name: new RegExp(testLink.label, 'i') });
    expect(activeLink).toHaveClass('active');
  });

  it('[Sidebar #07] Solicita confirmación y ejecuta logout al confirmar', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWithRouter(<SidebarFooter isSidebarOpen={true} onLogout={logout} />);

    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/seguro de que deseas cerrar/i)).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /cerrar sesi/i }),
    );

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('[Sidebar #08] Ejecuta onNavLinkClick al hacer clic en un enlace', () => {
    renderWithRouter(<SidebarNav role="ADMIN" onNavLinkClick={mockNavLinkClick} />);
    const enlace = screen.getByRole('link', { name: new RegExp(SIDEBAR_LINKS[0].links[0].label, 'i') });
    fireEvent.click(enlace);
    expect(mockNavLinkClick).toHaveBeenCalledTimes(1);
  });

  it('[Sidebar #08.2] Expande Tesorería y muestra todas sus secciones al administrador', () => {
    renderWithRouter(<SidebarNav role="ADMIN" onNavLinkClick={mockNavLinkClick} />);

    const treasuryButton = screen.getByRole('button', { name: /tesorería/i });
    expect(treasuryButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(treasuryButton);
    expect(treasuryButton).toHaveAttribute('aria-expanded', 'true');

    TREASURY_LINKS.forEach((link) => {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.path);
    });

    fireEvent.click(screen.getByRole('link', { name: 'Pagos' }));
    expect(mockNavLinkClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Resumen' })).not.toBeInTheDocument();
  });

  it('[Sidebar #08.4] Muestra solo Resumen de Tesorería al usuario común', () => {
    renderWithRouter(<SidebarNav role="USER" onNavLinkClick={mockNavLinkClick} />);

    fireEvent.click(screen.getByRole('button', { name: /tesorería/i }));

    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveAttribute(
      'href',
      '/tesoreria/resumen',
    );
    TREASURY_LINKS
      .filter((link) => link.path !== '/tesoreria/resumen')
      .forEach((link) => {
        expect(screen.queryByRole('link', { name: link.label })).not.toBeInTheDocument();
      });
  });

  it('[Sidebar #08.3] Cierra automáticamente el submenú de Tesorería', () => {
    vi.useFakeTimers();
    try {
      renderWithRouter(<SidebarNav role="USER" onNavLinkClick={mockNavLinkClick} />);
      const treasuryButton = screen.getByRole('button', { name: /tesorería/i });
      fireEvent.click(treasuryButton);

      expect(screen.getByRole('link', { name: 'Resumen' })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(6000));

      expect(screen.queryByRole('link', { name: 'Resumen' })).not.toBeInTheDocument();
      expect(treasuryButton).toHaveAttribute('aria-expanded', 'false');
    } finally {
      vi.useRealTimers();
    }
  });

  it('[Sidebar #08.1] Cierra el sidebar desde perfil, notificaciones y configuraciÃ³n', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('link', { name: /ver perfil/i }));
    fireEvent.click(screen.getByRole('link', { name: /notificaciones/i }));
    fireEvent.click(screen.getByRole('link', { name: /configuraci/i }));

    expect(mockNavLinkClick).toHaveBeenCalledTimes(3);
  });

  it('[Sidebar #09] Cambia el color de fondo del botón toggle según el estado isLocked', () => {
    renderSidebar({ isLocked: true });
    const toggleButton = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(toggleButton).toHaveStyle({ backgroundColor: "var(--color-warning)" });
  });
});



