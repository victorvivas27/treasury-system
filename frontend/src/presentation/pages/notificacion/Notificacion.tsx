

import { useNotifications } from "@/presentation/context/NotificationContext";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import type { NotificationReply, NotificationType, SentNotification } from
  "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from
  "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiEdit2, FiHelpCircle, FiRefreshCw, FiSend,
  FiMove, FiTrash2, FiUsers, FiXCircle } from "react-icons/fi";
import { FcExpand } from "react-icons/fc";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { IoNotificationsOutline } from "react-icons/io5";
import { MdDoneAll } from "react-icons/md";
import "./Notificacion.css";
import { NotificationTour, OPEN_NOTIFICATION_TOUR_EVENT } from "./NotificationTour";
import { useRealtime } from "@/presentation/context/RealtimeContext";

const labels = { INFO: "Informativa", IMPORTANT: "Importante", URGENT: "Urgente" };

const NotificationConversation = ({ deliveryId, repository, isAdmin, notificationItems,
  active = true, initialScrollToBottom = false }: {
  deliveryId: number; repository: NotificationRepositoryImpl; isAdmin: boolean;
  notificationItems: Array<{ id: string; createdAt: string; content: ReactNode }>;
  active?: boolean;
  initialScrollToBottom?: boolean;
}) => {
  const { connected, sendNotificationReply, subscribeMessages, registerActiveThread } = useRealtime();
  const auth = useOptionalAuth();
  const [messages, setMessages] = useState<NotificationReply[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<{
    left: number; top: number; width: number;
  } | null>(null);
  const renderedTimelineLength = useRef(0);
  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true); setError("");
    try { setMessages(await repository.listReplies(deliveryId)); setLoaded(true); }
    catch { setError("No fue posible cargar la conversación."); }
    finally { setLoading(false); }
  }, [deliveryId, loading, repository]);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);
  useEffect(() => {
    let unregister: () => void = () => undefined;
    const syncActiveThread = () => {
      unregister();
      unregister = active && document.visibilityState === "visible"
        ? registerActiveThread(deliveryId) : () => undefined;
    };
    syncActiveThread();
    document.addEventListener("visibilitychange", syncActiveThread);
    return () => { document.removeEventListener("visibilitychange", syncActiveThread); unregister(); };
  }, [active, deliveryId, registerActiveThread]);
  useEffect(() => subscribeMessages(event => {
    if (event.deletedMessageId !== undefined) {
      setMessages(current => current.filter(item => item.id !== event.deletedMessageId));
      return;
    }
    if (event.deliveryId !== deliveryId || !event.reply) return;
    const reply = event.reply;
    setMessages(current => current.some(item => item.id === reply.id)
      ? current : [...current, reply]);
    setLoaded(true);
    if (active && reply.authorId !== auth?.user?.id) {
      void repository.listReplies(deliveryId).then(setMessages);
    }
  }), [active, auth?.user?.id, deliveryId, repository, subscribeMessages]);
  const submit = () => {
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true); setError("");
    try {
      sendNotificationReply(deliveryId, message);
      setDraft("");
    } catch { setError("No fue posible enviar la respuesta."); }
    finally { setSending(false); }
  };
  const editMessage = async () => {
    if (editingId === null || !editingText.trim()) return;
    try {
      const updated = await repository.editReply(editingId, editingText.trim());
      setMessages(current => current.map(item => item.id === updated.id ? updated : item));
      setEditingId(null); setEditingText("");
    } catch { setError("El mensaje ya no puede editarse."); }
  };
  const deleteMessage = async (id: number) => {
    try {
      await repository.deleteReply(id);
      setMessages(current => current.filter(item => item.id !== id));
    } catch { setError("No fue posible eliminar el mensaje."); }
  };
  const timeline = [
    ...notificationItems.map(item => ({ ...item, kind: "notification" as const })),
    ...messages.map(message => ({ id: `reply-${message.id}`, createdAt: message.createdAt,
      kind: "reply" as const, message })),
  ].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  useLayoutEffect(() => {
    const container = timelineRef.current;
    if (!loaded || !container) return;
    const hasNewItems = timeline.length > renderedTimelineLength.current;
    const isInitialPosition = initialScrollToBottom && renderedTimelineLength.current === 0;
    renderedTimelineLength.current = timeline.length;
    if (!hasNewItems && !isInitialPosition) return;
    container.scrollTop = container.scrollHeight;
  }, [initialScrollToBottom, loaded, timeline.length]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const panel = panelRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !panel) return;
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      setFloatingPosition(current => current && ({ ...current,
        left: Math.min(maxLeft, Math.max(margin, event.clientX - drag.offsetX)),
        top: Math.min(maxTop, Math.max(margin, event.clientY - drag.offsetY)),
      }));
    };
    const stop = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);
  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const width = Math.min(rect.width, 290, window.innerWidth - 16);
    setFloatingPosition({ left: rect.left, top: rect.top, width });
    dragRef.current = { pointerId: event.pointerId,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.preventDefault();
  };
  const floatingStyle: CSSProperties | undefined = floatingPosition ? {
    left: floatingPosition.left, top: floatingPosition.top, width: floatingPosition.width,
  } : undefined;
  const panel = <div ref={panelRef}
    className={`notification-conversation ${floatingPosition ? "is-floating" : ""}`}
    style={floatingStyle}>
    {!isAdmin && <div className="notification-conversation__drag-handle" onPointerDown={startDragging}>
      <FiMove aria-hidden="true" /><span>Conversación</span>
      {floatingPosition && <button type="button" onPointerDown={event => event.stopPropagation()}
        onClick={() => setFloatingPosition(null)}>Volver a su lugar</button>}
    </div>}
    <div className="notification-conversation__content">
      {loading && <p className="notification-conversation__state">Cargando conversación…</p>}
      <div ref={timelineRef}
        className={`notification-conversation__messages ${isAdmin ? "sent-user-group__messages" : ""}`}>
      {timeline.map(item => item.kind === "notification" ? <div key={item.id}
        className="notification-timeline-item">{item.content}</div> : <article key={item.id}
        className={`notification-reply ${isAdminRole(item.message.authorRole) ? "is-admin" : "is-guardian"}`}>
        <header><span className="notification-reply__author">
          <UserAvatar className="notification-reply__avatar" fallbackName={item.message.authorName}
            user={{ nombre: item.message.authorName,
              profileImageType: item.message.authorProfileImageType,
              profileImageUrl: item.message.authorProfileImageUrl }}
            customImageUserId={item.message.authorId} />
          <strong>{isAdminRole(item.message.authorRole) ? "Tesorería" : item.message.authorName}</strong>
        </span>
          <time dateTime={item.message.createdAt}>{new Date(item.message.createdAt).toLocaleString("es-CL", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
          })}</time></header>
        {editingId === item.message.id ? <form className="notification-reply__edit"
          onSubmit={event => { event.preventDefault(); void editMessage(); }}>
          <textarea maxLength={2000} value={editingText}
            onChange={event => setEditingText(event.target.value)} aria-label="Editar mensaje" />
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setEditingId(null)}>Cancelar</button>
        </form> : <p>{item.message.message}</p>}
        {auth?.user?.id === item.message.authorId && editingId !== item.message.id
          && <footer className="notification-reply__actions">
            {Date.now() - new Date(item.message.createdAt).getTime() <= 15 * 60 * 1000
              && <button type="button" onClick={() => { setEditingId(item.message.id);
                setEditingText(item.message.message); }}><FiEdit2 /> Editar</button>}
            <button type="button" onClick={() => void deleteMessage(item.message.id)}>
              <FiTrash2 /> Eliminar</button>
          </footer>}
      </article>)}
      </div>
      {error && <p className="notification-conversation__error">{error}</p>}
      <form className="notification-reply-form" onSubmit={event => {
        event.preventDefault(); void submit();
      }}>
        <textarea aria-label={isAdmin ? "Responder al apoderado" : "Responder a administración"}
          placeholder={isAdmin ? "Escribe una respuesta al apoderado…" : "Escribe una respuesta a administración…"}
          maxLength={2000} rows={2} value={draft}
          onChange={event => setDraft(event.target.value)} />
        <button type="submit" disabled={!connected || !draft.trim() || sending}><FiSend />
          {sending ? "Enviando…" : "Responder"}</button>
      </form>
    </div>
  </div>;
  return floatingPosition ? createPortal(panel, document.body) : panel;
};

export const Notificacion = () => {
  const auth = useOptionalAuth();
  if (!auth?.user) return null;
  if (isAdminRole(auth.user.rol)) return <AdminNotificationCenter />;
  return <><GuardianInbox /><NotificationTour user={auth.user} /></>;
};

const AdminNotificationCenter = () => {
  const { unreadCount: adminUnreadCount, loading: notificationsLoading,
    markAllRead: markAllAdminRead } = useNotifications();
  const { apoderados, loading, error, currentPage, nextPage, prevPage, hasPrevPage,
    isLastPage, search, setSearch, refetch } = useApoderados({ pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "INFO" as NotificationType });
  const [alert, setAlert] = useState({ open: false, message: "", type: "success" as "success" | "error" });
  const [sent, setSent] = useState<SentNotification[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [openThreads, setOpenThreads] = useState<Set<number>>(new Set());
  const [floatingContact, setFloatingContact] = useState<{
    userId: number; left: number; top: number; width: number;
  } | null>(null);
  const contactDragRef = useRef<{
    userId: number; pointerId: number; startX: number; startY: number;
    offsetX: number; offsetY: number; element: HTMLElement;
  } | null>(null);
  const suppressContactClick = useRef<number | null>(null);
  const adminAutoReadRequested = useRef(false);
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const sentByRecipient = useMemo(() => {
    const groups = new Map<number, {
      userId: number; name: string; email: string;
      profileImageType: "INITIALS" | "PREDEFINED_AVATAR" | "CUSTOM_IMAGE";
      profileImageUrl: string | null;
      messages: Array<{ notification: SentNotification; deliveryId: number; read: boolean }>;
    }>();
    sent.forEach(notification => notification.recipients.forEach(recipient => {
      const group = groups.get(recipient.userId) ?? { userId: recipient.userId,
        name: recipient.name, email: recipient.email,
        profileImageType: recipient.profileImageType,
        profileImageUrl: recipient.profileImageUrl, messages: [] };
      group.messages.unshift({ notification, deliveryId: recipient.deliveryId, read: recipient.read });
      groups.set(recipient.userId, group);
    }));
    return [...groups.values()].sort((first, second) => first.name.localeCompare(second.name, "es"));
  }, [sent]);
  const loadSent = useCallback(async () => {
    setSentLoading(true);
    try { setSent(await repository.listSent()); } finally { setSentLoading(false); }
  }, [repository]);

  useEffect(() => { void loadSent(); }, [loadSent]);
  useEffect(() => {
    if (!notificationsLoading && adminUnreadCount > 0 && !adminAutoReadRequested.current) {
      adminAutoReadRequested.current = true;
      void markAllAdminRead();
    }
  }, [adminUnreadCount, markAllAdminRead, notificationsLoading]);
  useEffect(() => {
    const refreshSent = () => { void loadSent(); };
    window.addEventListener("notification-realtime-received", refreshSent);
    return () => window.removeEventListener("notification-realtime-received", refreshSent);
  }, [loadSent]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = contactDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (moved < 5 && floatingContact?.userId !== drag.userId) return;
      event.preventDefault();
      suppressContactClick.current = drag.userId;
      const rect = drag.element.getBoundingClientRect();
      const width = Math.min(290, window.innerWidth - 16);
      const height = Math.min(rect.height, window.innerHeight - 16);
      setFloatingContact({ userId: drag.userId, width,
        left: Math.min(window.innerWidth - width - 8,
          Math.max(8, event.clientX - drag.offsetX)),
        top: Math.min(window.innerHeight - height - 8,
          Math.max(8, event.clientY - drag.offsetY)),
      });
    };
    const stop = (event: PointerEvent) => {
      if (contactDragRef.current?.pointerId === event.pointerId) contactDragRef.current = null;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [floatingContact?.userId]);
  const startContactDrag = (event: ReactPointerEvent<HTMLElement>, userId: number) => {
    const element = event.currentTarget.parentElement as HTMLDetailsElement | null;
    if (event.button !== 0 || !element?.open) return;
    const rect = element.getBoundingClientRect();
    contactDragRef.current = { userId, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, element };
  };

  const toggle = (id: number, checked: boolean) => setSelectedIds(current => {
    const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next;
  });
  const composeForOne = (id: number) => {
    setSelectAll(false);
    setSelectedIds(new Set([id]));
    setComposerOpen(true);
  };
  const send = async () => {
    if (!form.title.trim() || !form.message.trim() || (!selectAll && !selectedIds.size)) return;
    setSending(true);
    try {
      const count = await repository.send({ ...form,
        title: form.title.trim(), message: form.message.trim(), recipientIds: [...selectedIds],
        sendToAll: selectAll });
      setComposerOpen(false); setSelectedIds(new Set()); setSelectAll(false);
      setForm({ title: "", message: "", type: "INFO" });
      await loadSent();
      setAlert({ open: true, message: `Notificación enviada a ${count} apoderado(s).`, type: "success" });
    } catch {
      setAlert({ open: true, message: "No fue posible enviar. Verifica que los apoderados tengan acceso.",
        type: "error" });
    } finally { setSending(false); }
  };

  const deleteSent = async (id: number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await repository.deleteSent(id);
      setSent(items => items.filter(item => item.id !== id));
    } catch {
      setAlert({ open: true, message: "No fue posible eliminar la notificación.", type: "error" });
    } finally { setDeletingId(null); }
  };

  return <main className="page-container notifications-page notifications-admin">
    <header className="page-header"><div><h1 className="page-header__title">Gestión de notificaciones</h1>
      <p className="page-header__subtitle">Selecciona apoderados y envía avisos desde un solo lugar.</p></div>
      <div className="page-header__actions">
        <Button label="Actualizar" variant="secondary" icon={<FiRefreshCw />} iconPosition="left"
          loading={loading} onClick={refetch} />
        <Button label="Crear notificación múltiple"
          icon={<IoNotificationsOutline />} iconPosition="left"
          disabled={!selectAll && selectedIds.size < 2}
          onClick={() => setComposerOpen(true)} />
      </div></header>
    <details className="notification-recipient-panel" open={recipientsOpen}
      onToggle={event => setRecipientsOpen(event.currentTarget.open)}>
      <summary className="notification-recipient-summary"><FiUsers aria-hidden="true" />
        <span>Apoderados destinatarios</span><small>{apoderados.length} en esta página</small>
        <FcExpand className="notification-recipient-summary__chevron" aria-hidden="true" />
      </summary>
      <div className="notification-recipient-content">
      <header className="notification-recipient-toolbar">
        <label><input type="checkbox" checked={selectAll} onChange={event => {
          setSelectAll(event.target.checked); if (event.target.checked) setSelectedIds(new Set());
        }} /> Seleccionar todos los apoderados</label>
        <input type="search" value={search} placeholder="Buscar apoderado"
          onChange={event => setSearch(event.target.value)} />
      </header>
      {error && <p className="notification-recipient-error">{error}</p>}
      <div className="notification-recipient-list">
        {apoderados.map(apoderado => <article key={apoderado.apoderadoId}
          className={`notification-recipient ${selectAll || selectedIds.has(apoderado.apoderadoId)
            ? "is-selected" : ""}`}>
          <input type="checkbox" disabled={selectAll}
            aria-label={`Seleccionar a ${apoderado.nombre}`}
            checked={selectAll || selectedIds.has(apoderado.apoderadoId)}
            onChange={event => toggle(apoderado.apoderadoId, event.target.checked)} />
          <span><strong>{apoderado.nombre}</strong></span>
          <em className={`guardian-access guardian-access--${(apoderado.accessStatus ?? "SIN_ACCESO").toLowerCase()}`}>
            {apoderado.accessStatus === "ACTIVO" ? "Activo" : apoderado.accessStatus === "INVITACION_PENDIENTE"
              ? "Pendiente" : "Sin acceso"}</em>
          {!selectAll && selectedIds.has(apoderado.apoderadoId) &&
            <button type="button" className="notification-recipient__compose"
              onClick={event => { event.preventDefault(); composeForOne(apoderado.apoderadoId); }}>
              <IoNotificationsOutline aria-hidden="true" /> Crear notificación
            </button>}
        </article>)}
        {!loading && !apoderados.length && <p className="notifications-empty">No hay apoderados.</p>}
      </div>
      <Pagination currentPage={currentPage + 1} hasPrevious={hasPrevPage} hasNext={!isLastPage}
        loading={loading} onPrevious={prevPage} onNext={nextPage}
        ariaLabel="Paginación de destinatarios" />
      </div>
    </details>
    <section className="sent-notifications">
      <header><div><h2>Notificaciones enviadas</h2>
        <p>Revisa el mensaje, sus destinatarios y quién lo leyó.</p></div>
        <Button label="Actualizar historial" variant="secondary" icon={<FiRefreshCw />}
          iconPosition="left" loading={sentLoading} onClick={() => void loadSent()} /></header>
      <div className="sent-notifications__list">
        {!sentLoading && !sentByRecipient.length && <div className="sent-notifications__empty"
          role="status">
          <div className="sent-notifications__empty-recipient" aria-hidden="true">
            <span className="sent-notifications__empty-avatar"><FiUsers /></span>
            <span className="sent-notifications__empty-identity">
              <i /><i />
            </span>
            <em>0 mensajes</em>
            <FcExpand />
          </div>
          <div className="sent-notifications__empty-message">
            <span className="sent-notifications__empty-icon" aria-hidden="true">
              <IoNotificationsOutline />
            </span>
            <span><strong>Todavía no has enviado notificaciones</strong>
              <small>Cuando envíes una, aparecerá aquí junto con su destinatario y estado de lectura.</small>
            </span>
          </div>
        </div>}
        {sentByRecipient.map(group => <details key={group.userId}
          className={`sent-user-group ${floatingContact?.userId === group.userId ? "is-floating" : ""}`}
          style={floatingContact?.userId === group.userId ? {
            left: floatingContact.left, top: floatingContact.top, width: floatingContact.width,
          } : undefined}
          onToggle={event => {
            const deliveryId = group.messages[group.messages.length - 1]?.deliveryId;
            const isOpen = event.currentTarget.open;
            if (deliveryId !== undefined) setOpenThreads(current => {
              const next = new Set(current);
              if (isOpen) next.add(deliveryId); else next.delete(deliveryId);
              return next;
            });
          }}>
          <summary onPointerDown={event => startContactDrag(event, group.userId)}
            onClick={event => {
              if (suppressContactClick.current !== group.userId) return;
              event.preventDefault(); event.stopPropagation(); suppressContactClick.current = null;
            }}><UserAvatar className="sent-user-group__avatar" fallbackName={group.name}
            user={{ nombre: group.name,
              profileImageType: group.profileImageType === "PREDEFINED_AVATAR"
                ? "PREDEFINED_AVATAR" : "INITIALS",
              profileImageUrl: group.profileImageUrl }} /><span><strong>{group.name}</strong>
            <small>{group.email}</small></span><em>{group.messages.length}
              {group.messages.length === 1 ? " mensaje" : " mensajes"}</em>
            {floatingContact?.userId === group.userId
              ? <button type="button" className="sent-user-group__restore"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => { event.preventDefault(); setFloatingContact(null); }}>
                Volver</button>
              : <FcExpand aria-hidden="true" />}</summary>
          {group.messages.length > 0 && <NotificationConversation
            deliveryId={group.messages[group.messages.length - 1].deliveryId}
            repository={repository} isAdmin
            active={openThreads.has(group.messages[group.messages.length - 1].deliveryId)}
            notificationItems={group.messages.map(({
              notification: item, read }) => ({ id: `notification-${item.id}`,
              createdAt: item.createdAt, content: <article
              className={`sent-notification chat-bubble chat-bubble--outgoing sent-notification--${
                item.type.toLowerCase()}`}>
              <header className="sent-notification__message-header">
                <IoNotificationsOutline aria-hidden="true" /><span>
                <span className="sent-notification__meta-row">
                  <small className="sent-notification__recipients"><b>Para:</b> {group.name}</small>
                  <span className="sent-notification__message-label"><MdDoneAll aria-hidden="true" />
                    <span>Mensaje enviado</span></span>
                </span>
                <strong>{item.title}</strong>
                <small>{new Date(item.createdAt).toLocaleString("es-CL", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit",
                  minute: "2-digit", hour12: false,
                })}</small></span>
                <em className={`sent-notification__read-status ${read ? "is-read" : "is-pending"}`}>
                  {read ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
                  {read ? "Leída" : "Pendiente"}
                </em>
                <button type="button" className="notification-delete-action"
                  disabled={deletingId !== null}
                  aria-label={`Eliminar notificación ${item.title}`} title="Eliminar para todos"
                  onClick={() => void deleteSent(item.id)}>
                  <FiTrash2 aria-hidden="true" />
                </button>
              </header>
              <div className="sent-notification__body">
                <p>{item.message}</p>
              </div>
            </article> }))} />}
        </details>)}
      </div>
    </section>
    <ModalConfirm isOpen={composerOpen} title="Nueva notificación"
      containerClassName="notification-compose-modal"
      message={selectAll ? "Se enviará a todos los apoderados con acceso."
        : `${selectedIds.size} destinatario(s) seleccionado(s).`}
      confirmLabel="Enviar" isLoading={sending} compact
      confirmIcon={<FiSend />}
      confirmDisabled={!form.title.trim() || !form.message.trim()}
      onCancel={() => setComposerOpen(false)} onConfirm={() => void send()}>
      <div className="notification-form">
        <label>Título<input maxLength={120} value={form.title}
          onChange={event => setForm(value => ({ ...value, title: event.target.value }))} /></label>
        <label><span className="notification-form__field-heading"><span>Mensaje</span>
          <small aria-live="polite">{form.message.length}/2000</small></span>
          <textarea maxLength={2000} rows={5} value={form.message}
            onChange={event => setForm(value => ({ ...value, message: event.target.value }))} /></label>
        <label>Prioridad<select value={form.type} onChange={event => setForm(value => ({ ...value,
          type: event.target.value as NotificationType }))}>
          <option value="INFO">Informativa</option><option value="IMPORTANT">Importante</option>
          <option value="URGENT">Urgente</option></select></label>
      </div>
    </ModalConfirm>
    <ModalAlert isOpen={alert.open} message={alert.message} type={alert.type}
      variant={alert.type === "success" ? "toast" : "modal"}
      autoCloseTime={alert.type === "success" ? 2500 : 0}
      onClose={() => setAlert(value => ({ ...value, open: false }))} />
  </main>;
};

const GuardianInbox = () => {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh,
    deleteNotification } = useNotifications();
  const [deleteError, setDeleteError] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const [treasuryContact, setTreasuryContact] = useState<{
    id: number; name: string; email: string;
    profileImageType: "INITIALS" | "PREDEFINED_AVATAR" | "CUSTOM_IMAGE";
    profileImageUrl: string | null;
  } | null>(null);
  const [startingConversation, setStartingConversation] = useState(false);
  const [startError, setStartError] = useState("");
  const firstMessageRef = useRef<HTMLTextAreaElement>(null);
  const autoReadRequested = useRef(false);
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const orderedNotifications = useMemo(() => [...notifications].reverse(), [notifications]);
  useEffect(() => {
    if (!loading && unreadCount > 0 && !autoReadRequested.current) {
      autoReadRequested.current = true;
      void markAllRead();
    }
  }, [loading, markAllRead, unreadCount]);
  useEffect(() => {
    if (treasuryContact) return;
    void repository.treasuryContact().then(setTreasuryContact).catch(() => setStartError(
      "No fue posible cargar el contacto de Tesorería."));
  }, [repository, treasuryContact]);
  const startConversation = async () => {
    const message = firstMessage.trim();
    if (!message || startingConversation) return;
    setStartingConversation(true); setStartError("");
    try {
      await repository.startTreasuryConversation(message);
      setFirstMessage("");
      await refresh();
    } catch { setStartError("No fue posible iniciar la conversación con Tesorería."); }
    finally { setStartingConversation(false); }
  };
  return <main className="page-container notifications-page notifications-inbox">
    <header className="page-header"><div><h1 className="page-header__title">Notificaciones</h1>
      <p className="page-header__subtitle">Mensajes y avisos de tesorería.</p></div>
      <div className="page-header__actions" data-notification-tour="actions">
        <span className="notification-tour-target" data-notification-tour="help">
          <Button label="Cómo usar" variant="secondary" icon={<FiHelpCircle />} iconPosition="left"
            className="notifications-help-action"
            onClick={() => window.dispatchEvent(new Event(OPEN_NOTIFICATION_TOUR_EVENT))} />
        </span>
        <Button label="Actualizar" variant="secondary"
        icon={<FiRefreshCw />} iconPosition="left"
        className="notifications-header-action notifications-header-action--refresh"
        loading={loading} onClick={() => void refresh()} />
        <Button label="Marcar todas como leídas" disabled={!unreadCount}
          icon={<FiCheckCircle />} iconPosition="left"
          className="notifications-header-action notifications-header-action--read"
          onClick={() => void markAllRead()} /></div></header>
    <section className="notifications-list" data-notification-tour="messages" aria-live="polite"
      aria-busy={loading}>
      {loading && notifications.length === 0 && <div className="notifications-loading" role="status"
        aria-label="Cargando mensajes">
        {[0, 1, 2].map(item => <article className="notification-message-skeleton" key={item}
          aria-hidden="true">
          <span className="notification-message-skeleton__avatar" />
          <div><span className="notification-message-skeleton__meta" />
            <span className="notification-message-skeleton__title" />
            <span className="notification-message-skeleton__line" />
            <span className="notification-message-skeleton__line is-short" /></div>
        </article>)}
      </div>}
      {!loading && notifications.length === 0 && <div className="notifications-empty-conversation">
        <section className="notifications-empty-conversation__contact-section">
          <h2>Contactos</h2>
          <div className="notifications-empty-conversation__contacts"
            aria-label="Contactos disponibles">
          <button type="button" className="notifications-contact-avatar is-selected"
            aria-label={`Conversar con ${treasuryContact?.name ?? "Tesorería"}`}
            title={treasuryContact?.name ?? "Tesorería"}
            aria-pressed="true"
            disabled={!treasuryContact}
            onClick={() => firstMessageRef.current?.focus()}>
            {treasuryContact ? <UserAvatar fallbackName={treasuryContact.name}
              user={{ nombre: treasuryContact.name,
                profileImageType: treasuryContact.profileImageType,
                profileImageUrl: treasuryContact.profileImageUrl }}
              customImageUserId={treasuryContact.id} /> : <FiUsers aria-hidden="true" />}
            <span className="notifications-contact-name">
              {treasuryContact?.name ?? "Tesorería"}
            </span>
          </button>
          </div>
        </section>
        <section className="notifications-empty-conversation__chat-section">
        <h2>Conversación</h2>
        <p className="notifications-empty-conversation__state">Aún no hay mensajes con Tesorería.</p>
        {startError && <p className="notification-conversation__error">{startError}</p>}
        <form className="notification-reply-form" onSubmit={event => {
          event.preventDefault(); void startConversation();
        }}>
          <textarea ref={firstMessageRef} maxLength={2000} value={firstMessage}
            onChange={event => setFirstMessage(event.target.value)}
            placeholder="Escribe un mensaje a Tesorería" aria-label="Mensaje para Tesorería" />
          <button type="submit" disabled={!firstMessage.trim() || startingConversation}>
            <FiSend /> {startingConversation ? "Enviando…" : "Enviar"}
          </button>
        </form>
        </section>
      </div>}
      {orderedNotifications.length > 0 && <NotificationConversation
        key={orderedNotifications[orderedNotifications.length - 1].id}
        deliveryId={orderedNotifications[orderedNotifications.length - 1].id}
        repository={repository} isAdmin={false} initialScrollToBottom
        notificationItems={orderedNotifications.map((item, index) => ({ id: `notification-${item.id}`,
          createdAt: item.createdAt, content: <article
        className={`notification-card chat-bubble chat-bubble--incoming notification-card--${item.type.toLowerCase()} ${
          item.read ? "is-read" : "is-unread"}`}
        style={{ "--message-delay": `${Math.min(index, 8) * 70}ms` } as CSSProperties}
        onClick={() => !item.read && void markRead(item.id)}>
        <span className="notification-card__icon"><IoNotificationsOutline aria-hidden="true" /></span>
        <div className="notification-card__content">
          <header><span className="notification-card__type">{labels[item.type]}
            <span className={`notification-card__read-status ${item.read ? "is-read" : ""}`}>
              {!item.read && <button type="button" className="notification-card__read-action"
                aria-label="Marcar como leída" onClick={event => {
                  event.stopPropagation(); void markRead(item.id);
                }}>Marcar como leído</button>}
              {item.read && <MdDoneAll aria-label="Leída" />}
            </span>
          </span><time dateTime={item.createdAt}>
            {new Date(item.createdAt).toLocaleString("es-CL", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              hour12: false,
            })}</time></header>
          <div className="notification-card__sender">
            <UserAvatar className="notification-card__sender-avatar" fallbackName={item.senderName}
              user={{ nombre: item.senderName, profileImageType: item.senderProfileImageType,
                profileImageUrl: item.senderProfileImageUrl }}
              customImageUserId={item.senderId} />
            <span><b>De:</b> {item.senderName}</span>
          </div>
          <h2>{item.title}</h2><p>{item.message}</p>
        </div>
        <button type="button" className="notification-delete-action"
          aria-label={`Eliminar notificación ${item.title}`} title="Eliminar de mi vista"
          onClick={event => { event.stopPropagation(); void deleteNotification(item.id)
            .catch(() => setDeleteError(true)); }}>
          <FiTrash2 aria-hidden="true" />
        </button>
      </article> }))} />}
    </section>
    <ModalAlert isOpen={deleteError} message="No fue posible eliminar la notificación."
      type="error" onClose={() => setDeleteError(false)} />
  </main>;
};
