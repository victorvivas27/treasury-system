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

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Shared sidebar group interaction", () => {
  it("switches immediately during animation and gives each new group six seconds", () => {
    const { button, container } = setup();
    for (const group of [...groups, "management"] as const) {
      fireEvent.pointerDown(button(group));
      fireEvent.click(button(group));
      expect(button(group)).toHaveAttribute("aria-expanded", "true");
      expect(container.querySelectorAll(".sidebar-submenu")).toHaveLength(1);
      expect(container.querySelectorAll(".sidebar-treasury-timer")).toHaveLength(1);
      advance(2500);
    }
    advance(3499);
    expect(button("management")).toHaveAttribute("aria-expanded", "true");
    advance(1);
    expect(button("management")).toHaveAttribute("aria-expanded", "false");
  });

  it.each(groups)("%s closes after six seconds of inactivity", group => {
    const { button } = setup();
    fireEvent.click(button(group));
    advance(5999);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    advance(1);
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
  });

  it.each(groups)("%s pauses over the whole group and resumes remaining time", group => {
    const { button, section } = setup();
    fireEvent.click(button(group));
    advance(2000);
    fireEvent.pointerEnter(section(group));
    expect(section(group).querySelector("circle")).toHaveStyle({ animationPlayState: "paused" });
    advance(10000);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerLeave(section(group));
    expect(section(group).querySelector("circle")).toHaveStyle({ animationPlayState: "running" });
    advance(3999);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    advance(1);
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
  });

  it.each(groups)("%s stays paused until both pointer and keyboard leave", group => {
    const { button, section } = setup();
    fireEvent.click(button(group));
    fireEvent.pointerEnter(section(group));
    act(() => button(group).focus());
    fireEvent.pointerLeave(section(group));
    advance(10000);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    const link = section(group).querySelector<HTMLAnchorElement>("a")!;
    act(() => link.focus());
    advance(10000);
    expect(button(group)).toHaveAttribute("aria-expanded", "true");
    act(() => link.blur());
    advance(6000);
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
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

  it.each(groups)("%s closes on navigation, outside click and repeated toggle", group => {
    const { button, section, navigate } = setup();
    fireEvent.click(button(group));
    fireEvent.click(section(group).querySelector("a")!);
    expect(navigate).toHaveBeenCalledOnce();
    expect(button(group)).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button(group));
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

  it("cleans up the timer when unmounted", () => {
    const { button, unmount } = setup();
    fireEvent.click(button("treasury"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    advance(6000);
  });
});
