import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { NotificationReplyEvent } from "@/presentation/context/RealtimeContext";
import type { AppNotification } from "@/core/A-domain/entities/notification/Notification";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Notificacion } from "./Notificacion";

const mocks = vi.hoisted(() => ({
  listReplies: vi.fn(),
  listSent: vi.fn(),
  treasuryContact: vi.fn(),
  loadImage: vi.fn(),
  send: vi.fn(),
  editReply: vi.fn(),
  messageHandlers: new Set<(event: NotificationReplyEvent) => void>(),
  notifications: [] as AppNotification[],
  notificationsLoading: false,
  apoderados: [] as Array<{ apoderadoId: number; nombre: string; accessStatus: string }>,
  authUser: { id: 1, nombre: "Administración", correo: "admin@test.cl", rol: "ADMIN" },
}));

vi.mock("@/shared/ui/user-avatar/profileImageCache", () => ({
  loadCachedProfileImage: mocks.loadImage,
}));
vi.mock("./NotificationTour", () => ({ NotificationTour: () => null }));

vi.mock("@/presentation/context/AuthContext", () => ({
  useOptionalAuth: () => ({
    user: mocks.authUser,
  }),
}));

vi.mock("@/presentation/context/NotificationContext", () => ({
  useNotifications: () => ({
    unreadCount: 0,
    loading: mocks.notificationsLoading,
    notifications: mocks.notifications,
    markAllRead: vi.fn(),
  }),
}));

vi.mock("@/presentation/hooks/apoderado/useApoderados", () => ({
  useApoderados: () => ({
    apoderados: mocks.apoderados, loading: false, error: "", currentPage: 0,
    nextPage: vi.fn(), prevPage: vi.fn(), hasPrevPage: false, isLastPage: true,
    search: "", setSearch: vi.fn(), refetch: vi.fn(),
  }),
}));

vi.mock("@/presentation/context/RealtimeContext", () => ({
  useRealtime: () => ({
    connected: false,
    sendNotificationReply: vi.fn(),
    subscribeMessages: (handler: (event: NotificationReplyEvent) => void) => {
      mocks.messageHandlers.add(handler);
      return () => { mocks.messageHandlers.delete(handler); };
    },
    registerActiveThread: () => () => undefined,
  }),
}));

vi.mock("@/core/C-infra/repositories/notification/NotificationRepositoryImpl", () => ({
  NotificationRepositoryImpl: vi.fn(function () {
    return { listSent: mocks.listSent, listReplies: mocks.listReplies,
      treasuryContact: mocks.treasuryContact, send: mocks.send, editReply: mocks.editReply };
  }),
}));

describe("Notificacion para administración", () => {
  beforeEach(() => {
    mocks.authUser = {
      id: 1, nombre: "Administración", correo: "admin@test.cl", rol: "ADMIN",
    };
    mocks.listReplies.mockReset();
    mocks.editReply.mockReset();
    mocks.messageHandlers.clear();
    mocks.listSent.mockReset();
    mocks.notifications = [];
    mocks.notificationsLoading = false;
    mocks.apoderados = [];
    mocks.loadImage.mockReset().mockResolvedValue("blob:avatar");
    mocks.send.mockReset().mockResolvedValue(1);
    mocks.treasuryContact.mockReset().mockResolvedValue({
      id: 1, name: "Administración", profileImageType: "INITIALS", profileImageUrl: null,
    });
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
        profileImageType: "CUSTOM_IMAGE",
        profileImageUrl: "version-1",
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

  it("muestra un loader mientras espera el historial administrativo", async () => {
    let resolve!: (items: never[]) => void;
    mocks.listSent.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<Notificacion />);
    expect(screen.getByRole("status", { name: "Cargando mensajes" })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no has enviado notificaciones")).not.toBeInTheDocument();
    await act(async () => resolve([]));
    expect(screen.queryByRole("status", { name: "Cargando mensajes" })).not.toBeInTheDocument();
    expect(screen.getByText("Todavía no has enviado notificaciones")).toBeInTheDocument();
  });

  it("solicita la foto personalizada del destinatario correcto", async () => {
    render(<Notificacion />);
    await screen.findByText("Apoderado Uno", { selector: "summary strong" });
    await waitFor(() => expect(mocks.loadImage).toHaveBeenCalledWith(expect.objectContaining({
      profileImageType: "CUSTOM_IMAGE", profileImageUrl: "version-1",
    }), 30));
  });

  it.each(["ADMIN", "USER"])("espera las respuestas antes de mostrar la conversación de %s", async rol => {
    mocks.authUser = { ...mocks.authUser, rol };
    mocks.notifications = [{ id: 20, title: "Aviso", message: "Mensaje de prueba", type: "INFO",
      read: true, readAt: null, createdAt: "2026-08-30T12:00:00Z", senderId: 1,
      senderName: "Administración", senderProfileImageType: "CUSTOM_IMAGE", senderProfileImageUrl: "version-1" }];
    let resolve!: (items: unknown[]) => void;
    mocks.listReplies.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<Notificacion />);
    if (rol === "ADMIN") {
      const recipient = await screen.findByText("Apoderado Uno", { selector: "summary strong" });
      fireEvent.click(recipient.closest("summary")!);
    }
    expect(await screen.findByRole("status", { name: "Cargando conversación" })).toBeVisible();
    expect(screen.queryByText("Mensaje de prueba")).not.toBeInTheDocument();
    await act(async () => resolve([{ id: 99, authorId: 30, authorName: "Apoderado Uno",
      authorRole: "USER", authorProfileImageType: "INITIALS", authorProfileImageUrl: null,
      message: "Respuesta completa", createdAt: "2026-08-30T12:01:00Z" }]));
    expect(screen.queryByRole("status", { name: "Cargando conversación" })).not.toBeInTheDocument();
    expect(screen.getByText("Mensaje de prueba")).toBeVisible();
    expect(screen.getByText("Respuesta completa")).toBeVisible();
    if (rol === "ADMIN") {
      expect(screen.getAllByRole("img", { name: "Sin leer" }).length).toBeGreaterThan(0);
      expect(screen.queryByText("Mensaje enviado")).not.toBeInTheDocument();
      expect(screen.queryByText("Para:")).not.toBeInTheDocument();
      expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
      expect(screen.queryByText("Aviso")).not.toBeInTheDocument();
    }
    if (rol === "USER") expect(mocks.loadImage).toHaveBeenCalledWith(expect.objectContaining({
      nombre: "Administración", profileImageType: "CUSTOM_IMAGE",
    }), 1);
  });

  it("espera el contacto antes de mostrar una bandeja vacía al apoderado", async () => {
    mocks.authUser = { ...mocks.authUser, rol: "USER" };
    let resolve!: (contact: unknown) => void;
    mocks.treasuryContact.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<Notificacion />);
    expect(screen.getByRole("status", { name: "Cargando mensajes" })).toBeInTheDocument();
    expect(screen.queryByText("Aún no hay mensajes con Tesorería.")).not.toBeInTheDocument();
    await act(async () => resolve({ id: 1, name: "Tesorería", profileImageType: "INITIALS", profileImageUrl: null }));
    expect(screen.getByText("Aún no hay mensajes con Tesorería.")).toBeInTheDocument();
  });

  it.each(["ADMIN", "USER"])("actualiza las tildes de cada mensaje para %s", async rol => {
    mocks.authUser = { ...mocks.authUser, rol };
    mocks.notifications = [{ id: 20, title: "Aviso", message: "Mensaje de prueba", type: "INFO",
      read: true, readAt: null, createdAt: "2026-08-30T12:00:00Z", senderId: 1,
      senderName: "Administración", senderProfileImageType: "INITIALS", senderProfileImageUrl: null }];
    const base = { authorId: 1, authorName: "Autor", authorRole: rol,
      authorProfileImageType: "INITIALS", authorProfileImageUrl: null,
      createdAt: "2026-08-30T12:01:00Z", updatedAt: null, readAt: null };
    mocks.listReplies.mockResolvedValue([
      { ...base, id: 91, message: "Primer mensaje leído", read: true },
      { ...base, id: 92, message: "Segundo mensaje pendiente", read: false },
      { ...base, id: 93, message: "Tercer mensaje pendiente", read: false },
    ]);
    render(<Notificacion />);
    if (rol === "ADMIN") {
      const recipient = await screen.findByText("Apoderado Uno", { selector: "summary strong" });
      fireEvent.click(recipient.closest("summary")!);
    }
    const first = (await screen.findByText("Primer mensaje leído")).closest("article")!;
    const second = screen.getByText("Segundo mensaje pendiente").closest("article")!;
    const third = screen.getByText("Tercer mensaje pendiente").closest("article")!;
    expect(within(first).getByRole("img", { name: "Leído" })).toHaveClass("is-read");
    expect(within(second).getByRole("img", { name: "Sin leer" })).toHaveClass("is-pending");
    expect(within(third).getByRole("img", { name: "Sin leer" })).toHaveClass("is-pending");
    act(() => mocks.messageHandlers.forEach(handler => handler({
      readMessageIds: [92], readDeliveryIds: [], readAt: "2026-08-30T12:02:00Z",
    })));
    expect(within(second).getByRole("img", { name: "Leído" })).toHaveClass("is-read");
    expect(within(third).getByRole("img", { name: "Sin leer" })).toHaveClass("is-pending");
    expect(mocks.listReplies).toHaveBeenCalledTimes(1);
    act(() => mocks.messageHandlers.forEach(handler => handler({ deliveryId: 20,
      updatedReply: { ...base, authorRole: rol as "ADMIN" | "USER", authorProfileImageType: "INITIALS",
        id: 92, message: "Mensaje editado en el otro dispositivo", read: true,
        readAt: "2026-08-30T12:02:00Z", updatedAt: "2026-08-30T12:03:00Z" },
    })));
    expect(screen.getByText("Mensaje editado en el otro dispositivo")).toBeInTheDocument();
    expect(screen.queryByText("Segundo mensaje pendiente")).not.toBeInTheDocument();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(mocks.listReplies).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Mensaje editado en el otro dispositivo")).toBeInTheDocument();
  });

  it("permite reintentar un historial fallido sin mostrar un falso estado vacío", async () => {
    mocks.listSent.mockRejectedValueOnce(new Error("fallo de red"));
    render(<Notificacion />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar carga de mensajes" }));
    expect(await screen.findByText("Apoderado Uno", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no has enviado notificaciones")).not.toBeInTheDocument();
  });

  it("envía una notificación escribiendo solo el mensaje, sin pedir título", async () => {
    render(<Notificacion />);
    await screen.findByText("Apoderado Uno", { selector: "summary strong" });
    fireEvent.click(screen.getByText("Apoderados destinatarios"));
    fireEvent.click(screen.getByLabelText("Seleccionar todos los apoderados"));
    fireEvent.click(screen.getByRole("button", { name: "Crear notificación" }));
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Enviar" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /Mensaje/ }), {
      target: { value: " Recordatorio de reunión para mañana. " },
    });
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({
      title: "Mensaje de Tesorería", message: "Recordatorio de reunión para mañana.",
      type: "INFO", recipientIds: [], sendToAll: true,
    }));
  });

  it("selecciona un apoderado sin agregar acciones dentro de su tarjeta", async () => {
    mocks.apoderados = [{ apoderadoId: 45, nombre: "Ana Pérez", accessStatus: "ACTIVO" }];
    render(<Notificacion />);
    await screen.findByText("Apoderado Uno", { selector: "summary strong" });
    fireEvent.click(screen.getByText("Apoderados destinatarios"));
    const create = screen.getByRole("button", { name: "Crear notificación" });
    expect(create).toBeDisabled();
    const checkbox = screen.getByLabelText("Seleccionar a Ana Pérez");
    const card = checkbox.closest("article")!;
    const elementsBefore = card.childElementCount;
    fireEvent.click(checkbox);
    expect(card).toHaveClass("is-selected");
    expect(card.childElementCount).toBe(elementsBefore);
    expect(card.querySelector("button")).toBeNull();
    expect(create).toBeEnabled();
    fireEvent.click(create);
    fireEvent.change(screen.getByRole("textbox", { name: /Mensaje/ }), {
      target: { value: "Mensaje individual" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      recipientIds: [45], sendToAll: false, message: "Mensaje individual",
    })));
  });

  it.each(["ADMIN", "USER"])("edita en un modal compacto sin perder el texto ante errores para %s", async rol => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
      close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
    });
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    mocks.authUser = { ...mocks.authUser, rol };
    mocks.notifications = [{ id: 20, title: "Aviso", message: "Mensaje de prueba", type: "INFO",
      read: true, readAt: null, createdAt: "2026-08-30T12:00:00Z", senderId: 1,
      senderName: "Administración", senderProfileImageType: "INITIALS", senderProfileImageUrl: null }];
    const reply = { id: 91, authorId: 1, authorName: "Autor", authorRole: rol,
      authorProfileImageType: "INITIALS", authorProfileImageUrl: null,
      createdAt: new Date().toISOString(), read: false, readAt: null, message: "Texto original" };
    mocks.listReplies.mockResolvedValue([reply]);
    mocks.editReply.mockRejectedValueOnce(new Error("fallo de red"))
      .mockResolvedValueOnce({ ...reply, message: "Texto corregido" });
    render(<Notificacion />);
    if (rol === "ADMIN") {
      const recipient = await screen.findByText("Apoderado Uno", { selector: "summary strong" });
      fireEvent.click(recipient.closest("summary")!);
    }
    const edit = await screen.findByRole("button", { name: "Editar" });
    edit.focus();
    fireEvent.click(edit);
    const modal = screen.getByRole("dialog", { name: "Editar mensaje" });
    const input = within(modal).getByRole("textbox", { name: "Mensaje" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "Texto corregido" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar" }));
    expect(await within(modal).findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(input).toHaveValue("Texto corregido");
    expect(screen.getByText("Texto original")).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Texto corregido")).toBeInTheDocument();
    expect(mocks.editReply).toHaveBeenLastCalledWith(91, "Texto corregido");
    expect(document.body.style.overflow).toBe("");
    expect(edit).toHaveFocus();
    fireEvent.click(edit);
    fireEvent.change(screen.getByRole("textbox", { name: "Mensaje" }), { target: { value: "" } });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Texto corregido")).toBeInTheDocument();
    expect(mocks.editReply).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
