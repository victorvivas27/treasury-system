import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeDashboardPreview } from "../components/HomeDashboardPreview";

const scroll = vi.fn();
function environment(desktop = true, reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query.includes("min-width") ? desktop : reduced,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private callback: (entries: unknown[]) => void) {}
    observe(node: HTMLElement) {
      Object.assign(node, { scrollTo: scroll });
      this.callback([{ target: node, intersectionRatio: 1, isIntersecting: true }]);
    }
    unobserve() {}
    disconnect() {}
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  scroll.mockClear();
});

describe("recorrido automático de la tablet", () => {
  it("abre paneles, desplaza solo la pantalla y vuelve al inicio sin controles extra", () => {
    environment();
    render(<HomeDashboardPreview />);
    expect(screen.queryByRole("button", { name: /pausar|reanudar/i })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6400));
    expect(screen.getByRole("button", { name: "Cuota anual" })).toHaveAttribute("aria-expanded", "true");
    act(() => vi.advanceTimersByTime(3300));
    expect(screen.getByRole("button", { name: "Cuota anual" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Aportes del curso" })).toHaveAttribute("aria-expanded", "true");
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
    act(() => vi.advanceTimersByTime(12800));
    expect(screen.getByRole("button", { name: "Aportes del curso" })).toHaveAttribute("aria-expanded", "false");
    act(() => vi.advanceTimersByTime(100));
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  it.each([[false, false], [true, true]])("conserva exploración manual en móvil o movimiento reducido (%s, %s)", (desktop, reduced) => {
    environment(desktop, reduced);
    render(<HomeDashboardPreview />);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("button", { name: "Cuota anual" })).toHaveAttribute("aria-expanded", "false");
    expect(scroll).not.toHaveBeenCalled();
  });
});
