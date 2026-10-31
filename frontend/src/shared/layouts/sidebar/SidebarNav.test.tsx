import { act, cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarNav } from "./SidebarNav";

vi.mock("@/presentation/hooks/architecture/useArchitectureAccess", () => ({
  useArchitectureAccess: () => ({ allowed: false }),
}));

const groups = ["management", "treasury", "academic"] as const;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const setup = () => {
  const navigate = vi.fn();
  const view = render(<MemoryRouter><SidebarNav role="ADMIN" onNavLinkClick={navigate} /></MemoryRouter>);
  const button = (group: string) => view.container.querySelector<HTMLButtonElement>(`[aria-controls="${group}-submenu"]`)!;
  const section = (group: string) => button(group).closest("li")!;
  return { ...view, navigate, button, section };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Shared sidebar group interaction", () => {
  it("closes the desktop management panel after choosing a destination", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { button, section, navigate } = setup();
    fireEvent.click(button("management"));
    expect(section("management").querySelector(".sidebar-management-panel")).not.toBeNull();
    fireEvent.click(section("management").querySelector("a")!);
    expect(navigate).toHaveBeenCalledOnce();
    expect(button("management")).toHaveAttribute("aria-expanded", "false");
  });
  it("keeps course tools in management and excludes global administration", () => {
    const { button, container } = setup();
    fireEvent.click(button("management"));
    for (const path of ["/parents", "/students", "/family", "/users", "/admin/horario-clases",
      "/admin/sobre-nosotros", "/admin/fotos-del-curso", "/admin/directiva"]) {
      expect(container.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
    for (const path of ["/admin/mejoras", "/admin/reportes-calidad", "/admin/arquitectura", "/administrations"]) {
      expect(container.querySelector(`a[href="${path}"]`)).toBeNull();
    }
  });

  it("switches between groups without a countdown circle", () => {
    const { button, container } = setup();
    for (const group of [...groups, "management"] as const) {
      fireEvent.pointerDown(button(group));
      fireEvent.click(button(group));
      expect(button(group)).toHaveAttribute("aria-expanded", "true");
      expect(container.querySelectorAll(".sidebar-submenu")).toHaveLength(1);
      expect(container.querySelector(".sidebar-treasury-timer")).toBeNull();
    }
  });

  it.each(groups)("%s stays open after inactivity and pointer leave", group => {
    const { button, section } = setup();
    fireEvent.click(button(group));
    fireEvent.pointerEnter(section(group));
    fireEvent.pointerLeave(section(group));
    advance(60000);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    expect(section(group).querySelector(".sidebar-treasury-timer")).toBeNull();
  });

  it.each(groups)("%s supports keyboard opening, Tab, Escape and focus restoration", async group => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const { button, section } = setup();
    act(() => button(group).focus());
    await user.keyboard("{Enter}");
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    await user.tab();
    expect(section(group)).toContainElement(document.activeElement as HTMLElement);
    vi.useFakeTimers();
    advance(10000);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    vi.useRealTimers();
    await user.keyboard("{Escape}");
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
    expect(button(group)).toHaveFocus();
  });

  it.each(groups)("%s stays open on navigation and closes on outside click or repeated toggle", group => {
    const { button, section, navigate } = setup();
    fireEvent.click(button(group));
    fireEvent.click(section(group).querySelector("a")!);
    expect(navigate).toHaveBeenCalledOnce();
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button(group));
    fireEvent.click(button(group));
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
  });

  it.each(groups)("%s enables the same single-highlight style and restores route highlighting on close", group => {
    const { button, container } = setup();
    const nav = container.querySelector("nav")!;
    fireEvent.click(button(group));
    expect(nav).toHaveClass("sidebar-nav--group-open");
    expect(container.querySelectorAll(".sidebar-nav-parent.is-open")).toHaveLength(1);
    fireEvent.click(button(group));
    expect(nav).not.toHaveClass("sidebar-nav--group-open");
  });

  it("cleans up event listeners when unmounted", () => {
    const { button, unmount } = setup();
    fireEvent.click(button("treasury"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    advance(6000);
  });
});
