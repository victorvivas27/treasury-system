import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./NotificationContext";

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, user: { id: 1 } },
  listMine: vi.fn(), unreadCount: vi.fn(), markAllRead: vi.fn(), markRead: vi.fn(), deleteMine: vi.fn(),
}));
vi.mock("./AuthContext", () => ({ useOptionalAuth: () => mocks.auth }));
vi.mock("@/shared/pwa/appBadge", () => ({ syncAppBadge: vi.fn(), subscriptionPayload: vi.fn(), urlBase64ToUint8Array: vi.fn() }));
vi.mock("@/core/C-infra/repositories/notification/NotificationRepositoryImpl", () => ({
  NotificationRepositoryImpl: vi.fn(function () { return mocks; }),
}));
const wrapper = NotificationProvider;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth = { isAuthenticated: true, user: { id: 1 } };
  mocks.listMine.mockResolvedValue([{ id: 1, message: "Aviso", read: false }]);
  mocks.unreadCount.mockResolvedValue(1);
  mocks.markAllRead.mockResolvedValue(undefined);
});

it("deduplicates concurrent refreshes and exposes an initial error for retry", async () => {
  mocks.listMine.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(useNotifications, { wrapper });
  await waitFor(() => expect(result.current.error).not.toBe(""));
  expect(result.current.loading).toBe(false);
  await act(async () => { await Promise.all([result.current.refresh(), result.current.refresh()]); });
  expect(mocks.listMine).toHaveBeenCalledTimes(2);
  expect(result.current.notifications).toHaveLength(1);
  expect(result.current.error).toBe("");
});

it("keeps existing messages visible during background refresh and failures", async () => {
  const { result } = renderHook(useNotifications, { wrapper });
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  mocks.listMine.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.loading).toBe(false);
  expect(result.current.notifications).toHaveLength(1);
  expect(result.current.error).not.toBe("");
});

it("discards a previous account response after signing out", async () => {
  let resolve!: (items: unknown[]) => void;
  mocks.listMine.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { result, rerender } = renderHook(useNotifications, { wrapper });
  mocks.auth = { isAuthenticated: false, user: { id: 1 } };
  rerender();
  await act(async () => { resolve([{ id: 1, message: "Respuesta anterior" }]); });
  expect(result.current.notifications).toEqual([]);
  expect(result.current.unreadCount).toBe(0);
});

it("does not let an older background response undo mark-all-read", async () => {
  const { result } = renderHook(useNotifications, { wrapper });
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  let resolve!: (items: unknown[]) => void;
  mocks.listMine.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.refresh(); });
  await act(async () => { await result.current.markAllRead(); });
  await act(async () => { resolve([{ id: 1, read: false }]); await pending; });
  expect(result.current.notifications[0].read).toBe(true);
  expect(result.current.unreadCount).toBe(0);
});
