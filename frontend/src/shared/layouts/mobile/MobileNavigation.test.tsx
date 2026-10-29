import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MobileNavigation } from "./MobileNavigation";

vi.mock("./MobileNavigation.css", () => ({}));

const state = vi.hoisted(() => ({ mobile: true, role: "USER", user: true, allowed: false, logout: vi.fn() }));
vi.mock("@/presentation/context/AuthContext", () => ({ useOptionalAuth: () => ({
  user: state.user ? { id: 1, nombre: "Maria Gonzalez", rol: state.role, profileImageType: "INITIALS" } : null,
  logout: state.logout,
}) }));
vi.mock("@/presentation/context/NotificationContext", () => ({ useOptionalNotifications: () => ({ unreadCount: 3 }) }));
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({ useArchitectureAccess: () => ({ allowed: state.allowed }) }));
vi.mock("@/presentation/components/improvement-center/ImprovementCenter", () => ({ ImprovementCenter: () => null }));

beforeEach(() => {
  state.mobile = true; state.role = "USER"; state.user = true; state.allowed = false; state.logout.mockReset();
  window.history.replaceState({}, "", "/");
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: state.mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { document.body.classList.remove("has-mobile-navigation"); });
const renderMenu = () => render(<BrowserRouter><MobileNavigation /></BrowserRouter>);
const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Más" }));
const back = async () => { act(() => window.history.back()); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument()); };

it("keeps desktop and unauthenticated screens free of mobile navigation", () => {
  state.mobile = false;
  const page = renderMenu();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  page.unmount(); state.mobile = true; state.user = false;
  renderMenu(); expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});
it("shows user destinations without administrative links and closes on browser Back", async () => {
  renderMenu(); openMenu();
  expect(screen.getByRole("dialog", { name: "Explorar" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Pagos" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Cuotas" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  await back();
  expect(document.body.style.overflow).not.toBe("hidden");
});
it("navigates to profile with one click and removes the sheet history entry", async () => {
  renderMenu(); openMenu(); fireEvent.click(screen.getByRole("link", { name: "Mi perfil" }));
  await waitFor(() => expect(window.location.pathname).toBe("/profile"));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(window.history.state?.mobileNavigation).not.toBe(true);
});
it("shows admin destinations but keeps architecture restricted", async () => {
  state.role = "ADMIN"; renderMenu(); openMenu();
  expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cuotas" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Administraciones" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Arquitectura del sistema" })).not.toBeInTheDocument();
  await back();
});
it("logs out once after closing the sheet", async () => {
  renderMenu(); openMenu(); fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(state.logout).toHaveBeenCalledOnce());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("closes with Escape through the native dialog cancel event", async () => {
  renderMenu(); openMenu(); fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("releases the scroll lock if the session ends with the sheet open", () => {
  const page = renderMenu(); openMenu();
  expect(document.body.style.overflow).toBe("hidden");
  state.user = false;
  page.rerender(<BrowserRouter><MobileNavigation /></BrowserRouter>);
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
