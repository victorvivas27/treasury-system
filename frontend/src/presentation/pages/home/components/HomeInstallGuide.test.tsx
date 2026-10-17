import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
});
import { HomeInstallGuide } from "./HomeInstallGuide";
beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const openPrompt = () => { render(<HomeInstallGuide />); act(() => { vi.advanceTimersByTime(3000); }); };
it("closes automatically and does not repeat in the same session", () => {
  openPrompt();
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(document.body.style.overflow).toBe("hidden");
  act(() => { vi.advanceTimersByTime(12000); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Abrir opciones de instalación" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar invitación" }));
  expect(screen.getByRole("button", { name: "Abrir opciones de instalación" })).toBeVisible();
  cleanup();
  render(<HomeInstallGuide />);
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("keeps instructions open for reading and allows dismissal", async () => {
  openPrompt();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Instalar app" })); });
  expect(screen.getByRole("status")).toHaveTextContent("Abre el menú ⋮ de Chrome");
  fireEvent.click(screen.getByRole("button", { name: "Ver pasos para Firefox" }));
  expect(screen.getByRole("status")).toHaveTextContent("Firefox para Windows");
  expect(screen.getByRole("button", { name: "Ver pasos para Firefox" })).toHaveAttribute("aria-pressed", "true");
  act(() => { vi.advanceTimersByTime(20000); });
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("opens the native prompt from a click and closes on acceptance", async () => {
  const prompt = vi.fn().mockResolvedValue({ outcome: "accepted" });
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt });
  act(() => { window.dispatchEvent(event); });
  openPrompt();
  expect(event.defaultPrevented).toBe(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Instalar app" })); });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
