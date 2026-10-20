import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSidebarBehavior } from "./useSidebarBehavior";

describe("useSidebarBehavior", () => {
  afterEach(() => vi.useRealTimers());

  it("closes after a hovered submenu disappears during navigation", () => {
    const { result } = renderHook(() => useSidebarBehavior());
    act(() => result.current.onToggleSidebar());
    act(() => result.current.onSidebarPointerEnter());
    act(() => result.current.onNavLinkClick());
    expect(result.current.sidebarState).toBe("icons");
    const move = new MouseEvent("pointermove", { bubbles: true });
    Object.defineProperty(move, "pointerType", { value: "mouse" });
    act(() => document.body.dispatchEvent(move));
    expect(result.current.sidebarState).toBe("hidden");
  });

  it("stays open without a timer while the mouse is inside, then hides on exit", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSidebarBehavior());
    act(() => result.current.onSidebarPointerEnter());
    expect(result.current.sidebarState).toBe("hidden");
    act(() => result.current.onToggleSidebar());
    expect(result.current.sidebarState).toBe("icons");
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.sidebarState).toBe("icons");
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.onNavLinkClick());
    expect(result.current.sidebarState).toBe("icons");
    act(() => result.current.onSidebarPointerLeave());
    expect(result.current.sidebarState).toBe("hidden");
  });

  it("supports keyboard focus without closing while the mouse remains inside", () => {
    const { result } = renderHook(() => useSidebarBehavior());
    act(() => result.current.onSidebarFocus());
    expect(result.current.sidebarState).toBe("icons");
    act(() => result.current.onSidebarBlur());
    expect(result.current.sidebarState).toBe("hidden");
    act(() => { result.current.onSidebarPointerEnter(); result.current.onSidebarFocus(); });
    act(() => result.current.onSidebarBlur());
    expect(result.current.sidebarState).toBe("icons");
    act(() => result.current.onSidebarPointerLeave());
    expect(result.current.sidebarState).toBe("hidden");
  });

  it("keeps the touch toggle cycle and closes after choosing a destination", () => {
    const { result } = renderHook(() => useSidebarBehavior());
    expect(result.current.sidebarState).toBe("hidden");
    act(() => result.current.onToggleSidebar());
    expect(result.current.sidebarState).toBe("icons");
    act(() => result.current.onToggleSidebar());
    expect(result.current.sidebarState).toBe("expanded");
    act(() => result.current.onNavLinkClick());
    expect(result.current.sidebarState).toBe("hidden");
    act(() => result.current.onToggleSidebar());
    act(() => result.current.onToggleSidebar());
    act(() => result.current.onToggleSidebar());
    expect(result.current.sidebarState).toBe("hidden");
  });
});
