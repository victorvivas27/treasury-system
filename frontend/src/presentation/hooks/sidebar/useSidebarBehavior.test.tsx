import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSidebarBehavior } from "./useSidebarBehavior";

const viewport = (mobile: boolean) => {
  const media = { matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return media;
};
afterEach(() => vi.unstubAllGlobals());

describe("useSidebarBehavior", () => {
  it("starts compact and stays open on desktop navigation until dismissed", () => {
    viewport(false);
    const { result } = renderHook(useSidebarBehavior);
    expect(result.current.sidebarState).toBe("icons");
    act(() => result.current.onToggleSidebar());
    act(() => result.current.onNavLinkClick());
    expect(result.current.sidebarState).toBe("expanded");
    act(() => result.current.closeSidebar());
    expect(result.current.sidebarState).toBe("icons");
  });
  it("opens directly on mobile, locks scrolling and closes after navigation or Escape", () => {
    viewport(true);
    const { result, unmount } = renderHook(useSidebarBehavior);
    expect(result.current.sidebarState).toBe("hidden");
    act(() => result.current.onToggleSidebar());
    expect(result.current.sidebarState).toBe("expanded");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => result.current.onNavLinkClick());
    expect(result.current.sidebarState).toBe("hidden");
    expect(document.body.style.overflow).toBe("");
    act(() => result.current.onToggleSidebar());
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(result.current.sidebarState).toBe("hidden");
    act(() => result.current.onToggleSidebar());
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
  it("resets navigation when crossing the mobile breakpoint", () => {
    const media = viewport(false);
    const { result } = renderHook(useSidebarBehavior);
    const change = media.addEventListener.mock.calls[0][1];
    act(() => { media.matches = true; change(); });
    expect(result.current.sidebarState).toBe("hidden");
    act(() => { media.matches = false; change(); });
    expect(result.current.sidebarState).toBe("icons");
  });
});
