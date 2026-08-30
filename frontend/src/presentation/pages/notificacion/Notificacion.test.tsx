import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Notificacion } from "./Notificacion";

const mocks = vi.hoisted(() => ({
  listReplies: vi.fn(),
  listSent: vi.fn(),
  authUser: { id: 1, nombre: "Administración", correo: "admin@test.cl", rol: "ADMIN" },
}));

vi.mock("@/presentation/context/AuthContext", () => ({
  useOptionalAuth: () => ({
    user: mocks.authUser,
  }),
}));

vi.mock("@/presentation/context/NotificationContext", () => ({
  useNotifications: () => ({
    unreadCount: 0,
    loading: false,
    markAllRead: vi.fn(),
  }),
}));

vi.mock("@/presentation/hooks/apoderado/useApoderados", () => ({
  useApoderados: () => ({
    apoderados: [], loading: false, error: "", currentPage: 0,
    nextPage: vi.fn(), prevPage: vi.fn(), hasPrevPage: false, isLastPage: true,
    search: "", setSearch: vi.fn(), refetch: vi.fn(),
  }),
}));

vi.mock("@/presentation/context/RealtimeContext", () => ({
  useRealtime: () => ({
    connected: false,
    sendNotificationReply: vi.fn(),
    subscribeMessages: () => () => undefined,
    registerActiveThread: () => () => undefined,
  }),
}));

vi.mock("@/core/C-infra/repositories/notification/NotificationRepositoryImpl", () => ({
  NotificationRepositoryImpl: vi.fn(function () {
    return { listSent: mocks.listSent, listReplies: mocks.listReplies };
  }),
}));

describe("Notificacion para administración", () => {
  beforeEach(() => {
    mocks.authUser = {
      id: 1, nombre: "Administración", correo: "admin@test.cl", rol: "ADMIN",
    };
    mocks.listReplies.mockReset();
    mocks.listSent.mockReset();
    mocks.listSent.mockResolvedValue([{
      id: 10,
      title: "Aviso",
      message: "Mensaje de prueba",
      type: "INFO",
      createdAt: "2026-08-30T12:00:00Z",
      recipients: [{
        deliveryId: 20,
        userId: 30,
        name: "Apoderado Uno",
        email: "apoderado@test.cl",
        read: false,
        readAt: null,
        profileImageType: "INITIALS",
        profileImageUrl: null,
      }],
    }]);
  });

  it("carga la conversación al abrirla y no repite indefinidamente una carga fallida", async () => {
    mocks.listReplies.mockRejectedValue(new Error("fallo de red"));
    render(<Notificacion />);

    const recipient = await screen.findByText("Apoderado Uno", { selector: "summary strong" });
    expect(mocks.listReplies).not.toHaveBeenCalled();

    fireEvent.click(recipient.closest("summary")!);

    expect(await screen.findByText("No fue posible cargar la conversación.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.listReplies).toHaveBeenCalledTimes(1));
  });

  it("descarta el historial anterior cuando cambia la cuenta administrativa", async () => {
    const { rerender } = render(<Notificacion />);
    expect(await screen.findByText("Apoderado Uno", { selector: "summary strong" }))
      .toBeInTheDocument();

    mocks.listSent.mockResolvedValue([]);
    mocks.authUser = {
      id: 2, nombre: "Otra administración", correo: "otra@test.cl", rol: "ADMIN",
    };
    rerender(<Notificacion />);

    expect(await screen.findByText("Todavía no has enviado notificaciones")).toBeInTheDocument();
    expect(screen.queryByText("Apoderado Uno", { selector: "summary strong" }))
      .not.toBeInTheDocument();
    expect(mocks.listSent).toHaveBeenCalledTimes(2);
  });
});
