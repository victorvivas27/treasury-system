import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
});
import { HomeInstallGuide } from "./HomeInstallGuide";
beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const openPrompt = () => {
  render(<HomeInstallGuide />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir opciones de instalación" }));
};
it("opens only from the installation button and restores scrolling when dismissed", () => {
  render(<HomeInstallGuide />);
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Abrir opciones de instalación" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(document.body.style.overflow).toBe("hidden");
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar guía de instalación" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
  expect(screen.getByRole("button", { name: "Abrir opciones de instalación" })).toBeVisible();
});
it.each([
  ["Android", "Google Chrome", 5, "Desplázate hacia abajo hasta «Instala y crea acceso directo»."],
  ["Android", "Mozilla Firefox", 5, "Toca «Agregar app a la pantalla de inicio»."],
  ["Android", "Microsoft Edge", 6, "Desplázate hacia la derecha hasta «Agregar al teléfono»."],
  ["iPhone (iOS)", "Safari", 6, "Toca las tres rayitas (☰) del lado izquierdo."],
  ["iPhone (iOS)", "Google Chrome", 5, "Toca «+ Añadir a pantalla de inicio»."],
  ["iPhone (iOS)", "Mozilla Firefox", 5, "Toca «+ Añadir a pantalla de inicio»."],
  ["iPhone (iOS)", "Microsoft Edge", 6, "Toca el menú de las tres rayitas (☰)."],
])("guides %s users through %s and supports returning", (system, browser, count, instruction) => {
  openPrompt();
  expect(screen.queryByRole("button", { name: "Safari" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: system }));
  expect(screen.queryByRole("button", { name: "Safari" }) !== null).toBe(system === "iPhone (iOS)");
  fireEvent.click(screen.getByRole("button", { name: browser }));
  expect(screen.getAllByRole("listitem")).toHaveLength(count);
  expect(screen.getByText(instruction)).toBeVisible();
  expect(screen.queryByRole("group", { name: "Navegadores" })).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("group", { name: "Navegadores" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("group", { name: "Sistemas operativos" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});
it("never invokes the native installation prompt", () => {
  const prompt = vi.fn();
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt });
  act(() => { window.dispatchEvent(event); });
  openPrompt();
  fireEvent.click(screen.getByRole("button", { name: "Android" }));
  fireEvent.click(screen.getByRole("button", { name: "Google Chrome" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
  expect(prompt).not.toHaveBeenCalled();
});
it("hides the guide when the application becomes installed", () => {
  openPrompt();
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Abrir opciones de instalación" })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});
