

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
import { FiEdit2, FiHelpCircle, FiSend,
  FiMove, FiTrash2, FiUsers } from "react-icons/fi";
import { FcExpand } from "react-icons/fc";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { IoNotificationsOutline } from "react-icons/io5";
import { MdDone, MdDoneAll } from "react-icons/md";
import "./Notificacion.css";
import { NotificationTour, OPEN_NOTIFICATION_TOUR_EVENT } from "./NotificationTour";
import { useRealtime } from "@/presentation/context/RealtimeContext";
import { MessageEditModal } from "./MessageEditModal";

const labels = { INFO: "Informativa", IMPORTANT: "Importante", URGENT: "Urgente" };

const MessageReadStatus = ({ read }: { read: boolean }) =>
  <span className={`message-read-status ${read ? "is-read" : "is-pending"}`}
    role="img" aria-label={read ? "Leído" : "Sin leer"}
    title={read ? "El destinatario leyó este mensaje" : "El destinatario aún no ha leído este mensaje"}>
    {read ? <MdDoneAll aria-hidden="true" /> : <MdDone aria-hidden="true" />}
  </span>;

const NotificationLoading = ({ label = "Cargando mensajes" }: { label?: string }) =>
  <div className="notifications-loading" role="status" aria-label={label}>
    <p className="notification-conversation__state">{label}…</p>
    {[0, 1, 2].map(item => <article className="notification-message-skeleton" key={item}
      aria-hidden="true">
      <span className="notification-message-skeleton__avatar" />
      <div><span className="notification-message-skeleton__meta" />
        <span className="notification-message-skeleton__title" />
        <span className="notification-message-skeleton__line" />
        <span className="notification-message-skeleton__line is-short" /></div>
    </article>)}
  </div>;

const NotificationConversation = ({ deliveryId, deliveryIds, repository, isAdmin, notificationItems,
  active = true, initialScrollToBottom = false }: {
  deliveryId: number; deliveryIds: number[]; repository: NotificationRepositoryImpl; isAdmin: boolean;
  notificationItems: Array<{ id: string; createdAt: string; content: ReactNode }>;
  active?: boolean;
  initialScrollToBottom?: boolean;
}) => {
  const { subscribeMessages, registerActiveThread } = useRealtime();
  const auth = useOptionalAuth();
  const [messages, setMessages] = useState<NotificationReply[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const sendingRef = useRef(false);
  const readReceipts = useRef(new Map<number, string>());
  const messageUpdates = useRef(new Map<number, NotificationReply>());
  const withReadReceipt = useCallback((message: NotificationReply) => {
    const update = messageUpdates.current.get(message.id);
    const value = update && new Date(update.updatedAt ?? update.createdAt).getTime()
      > new Date(message.updatedAt ?? message.createdAt).getTime() ? update : message;
    const readAt = readReceipts.current.get(message.id) ?? (message.read ? message.readAt : null);
    return readAt ? { ...value, read: true, readAt } : value;
  }, []);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<{
    left: number; top: number; width: number;
  } | null>(null);
  const renderedTimelineLength = useRef(0);
  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true); setError("");
    try {
      const received = await repository.listReplies(deliveryId);
      setMessages(received.map(withReadReceipt)); setLoaded(true);
    }
    catch { setError("No fue posible cargar la conversación."); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [deliveryId, repository, withReadReceipt]);
  useEffect(() => {
    const refreshVisible = () => {
      if (active && document.visibilityState === "visible") void load();
    };
    refreshVisible();
    document.addEventListener("visibilitychange", refreshVisible);
    return () => document.removeEventListener("visibilitychange", refreshVisible);
  }, [active, load]);
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
    if (event.updatedReply && event.deliveryId !== undefined && deliveryIds.includes(event.deliveryId)) {
      const updated = withReadReceipt(event.updatedReply);
      messageUpdates.current.set(updated.id, updated);
      setMessages(current => current.map(item => item.id === updated.id ? updated : item));
      return;
    }
    if (event.readMessageIds?.length) {
      const ids = new Set(event.readMessageIds);
      if (event.readAt) ids.forEach(id => readReceipts.current.set(id, event.readAt!));
      setMessages(current => current.map(item => ids.has(item.id)
        ? { ...item, read: true, readAt: event.readAt ?? item.readAt } : item));
      return;
    }
    if (event.deletedMessageId !== undefined) {
      setMessages(current => current.filter(item => item.id !== event.deletedMessageId));
      return;
    }
    if (event.deliveryId === undefined || !deliveryIds.includes(event.deliveryId) || !event.reply) return;
    const reply = withReadReceipt(event.reply);
    setMessages(current => current.some(item => item.id === reply.id)
      ? current : [...current, reply]);
    if (active && document.visibilityState === "visible" && reply.authorId !== auth?.user?.id) {
      void repository.listReplies(deliveryId).then(received => setMessages(received.map(withReadReceipt)))
        .catch(() => setError("No fue posible actualizar la lectura del mensaje."));
    }
  }), [active, auth?.user?.id, deliveryId, deliveryIds, repository, subscribeMessages, withReadReceipt]);
  const submit = async () => {
    const message = draft.trim();
    if (!message || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true); setError("");
    try {
      const saved = withReadReceipt(await repository.reply(deliveryId, message));
      setMessages(current => current.some(item => item.id === saved.id) ? current : [...current, saved]);
      setDraft(current => current.trim() === message ? "" : current);
    } catch { setError("No se pudo enviar el mensaje. Tu texto se conservó; vuelve a intentarlo."); }
    finally { sendingRef.current = false; setSending(false); }
  };
  const editMessage = async (text: string) => {
    if (editingId === null) return;
    const updated = withReadReceipt(await repository.editReply(editingId, text));
    messageUpdates.current.set(updated.id, updated);
    setMessages(current => current.map(item => item.id === updated.id ? updated : item));
    setEditingId(null);
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
    const frame = window.requestAnimationFrame(() => {
      const current = timelineRef.current;
      if (!current) return;
      const hasOverflow = current.scrollHeight > current.clientHeight + 8;
      current.scrollTop = hasOverflow ? current.scrollHeight : 0;
    });
    return () => window.cancelAnimationFrame(frame);
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
  const initialLoading = !loaded && !error;
  const panel = <div ref={panelRef}
    className={`notification-conversation ${floatingPosition ? "is-floating" : ""}`}
    style={floatingStyle}>
    {!isAdmin && <div className="notification-conversation__drag-handle" onPointerDown={startDragging}>
      <FiMove aria-hidden="true" /><span>Conversación</span>
      {floatingPosition && <button type="button" onPointerDown={event => event.stopPropagation()}
        onClick={() => setFloatingPosition(null)}>Volver a su lugar</button>}
    </div>}
    <div className="notification-conversation__content">
      <div ref={timelineRef} aria-busy={initialLoading}
        className={`notification-conversation__messages ${!initialLoading ? "is-ready" : ""} ${isAdmin ? "sent-user-group__messages" : ""}`}>
      {initialLoading && <NotificationLoading label="Cargando conversación" />}
      {!initialLoading && timeline.map(item => item.kind === "notification" ? <div key={item.id}
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
        <p>{item.message.message}</p>
        <div className="notification-reply__receipt"><MessageReadStatus read={item.message.read} /></div>
        {auth?.user?.id === item.message.authorId
          && <footer className="notification-reply__actions">
            {Date.now() - new Date(item.message.createdAt).getTime() <= 15 * 60 * 1000
              && <button type="button" onClick={event => { setEditingId(item.message.id);
                setEditAnchor(event.currentTarget.closest("article")); }}><FiEdit2 /> Editar</button>}
            <button type="button" onClick={() => void deleteMessage(item.message.id)}>
              <FiTrash2 /> Eliminar</button>
          </footer>}
      </article>)}
      </div>
      {error && <p className="notification-conversation__error">{error}</p>}
      {error && !loaded && <button type="button" disabled={loading} onClick={() => void load()}>
        Reintentar carga de conversación</button>}
      <form className="notification-reply-form" onSubmit={event => {
        event.preventDefault(); void submit();
      }}>
        <textarea disabled={initialLoading || sending} aria-label={isAdmin ? "Responder al apoderado" : "Responder a administración"}
          placeholder={isAdmin ? "Escribe una respuesta al apoderado…" : "Escribe una respuesta a administración…"}
          maxLength={2000} rows={2} value={draft}
          onChange={event => setDraft(event.target.value)} />
        <button type="submit" disabled={initialLoading || !draft.trim() || sending}><FiSend />
          {sending ? "Enviando…" : "Responder"}</button>
      </form>
    </div>
  </div>;
  const editedMessage = messages.find(message => message.id === editingId);
  return <>
    {floatingPosition ? createPortal(panel, document.body) : panel}
    {editedMessage && <MessageEditModal key={editedMessage.id} message={editedMessage.message}
      anchor={editAnchor} onSave={editMessage} onClose={() => setEditingId(null)} />}
  </>;
};

export const Notificacion = () => {
  const auth = useOptionalAuth();
  if (!auth?.user) return null;
  if (isAdminRole(auth.user.rol)) return <AdminNotificationCenter key={auth.user.id} />;
  return <><GuardianInbox key={auth.user.id} /><NotificationTour user={auth.user} /></>;
};

const AdminNotificationCenter = () => {
  const { apoderados, loading, error, currentPage, nextPage, prevPage, hasPrevPage,
    isLastPage, search, setSearch } = useApoderados({ pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ message: "", type: "INFO" as NotificationType });
  const [alert, setAlert] = useState({ open: false, message: "", type: "success" as "success" | "error" });
  const [sent, setSent] = useState<SentNotification[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentError, setSentError] = useState(false);
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
  const loadSent = useCallback(async (showLoading = true) => {
    if (showLoading) setSentLoading(true);
    setSentError(false);
    try { setSent(await repository.listSent()); }
    catch { setSentError(true); }
    finally { setSentLoading(false); }
  }, [repository]);

  useEffect(() => { void loadSent(); }, [loadSent]);
  useEffect(() => {
    const refreshSent = () => { void loadSent(false); };
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
  const send = async () => {
    if (!form.message.trim() || (!selectAll && !selectedIds.size)) return;
    setSending(true);
    try {
      const count = await repository.send({ ...form,
        title: "Mensaje de Tesorería", message: form.message.trim(), recipientIds: [...selectedIds],
        sendToAll: selectAll });
      setComposerOpen(false); setSelectedIds(new Set()); setSelectAll(false);
      setForm({ message: "", type: "INFO" });
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
        <Button label="Crear notificación"
          icon={<IoNotificationsOutline />} iconPosition="left"
          disabled={!selectAll && selectedIds.size === 0}
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
        <p>Revisa el mensaje, sus destinatarios y quién lo leyó.</p></div></header>
      <div className="sent-notifications__list" aria-busy={sentLoading}>
        {sentLoading && !sentByRecipient.length && <NotificationLoading />}
        {sentError && <div role="alert" className="notification-conversation__error">
          No fue posible cargar los mensajes.
          <button type="button" onClick={() => void loadSent()}>Reintentar carga de mensajes</button>
        </div>}
        {!sentLoading && !sentError && !sentByRecipient.length && <div className="sent-notifications__empty"
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
            user={{ nombre: group.name, profileImageType: group.profileImageType,
              profileImageUrl: group.profileImageUrl }}
            customImageUserId={group.userId} /><span><strong>{group.name}</strong>
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
            deliveryIds={group.messages.map(item => item.deliveryId)}
            repository={repository} isAdmin
            active={openThreads.has(group.messages[group.messages.length - 1].deliveryId)}
            notificationItems={group.messages.map(({
              notification: item, read }) => ({ id: `notification-${item.id}`,
              createdAt: item.createdAt, content: <article
              className={`sent-notification chat-bubble chat-bubble--outgoing sent-notification--${
                item.type.toLowerCase()}`}>
              <div className="sent-notification__body">
                <p>{item.message}</p>
              </div>
              <footer className="sent-notification__message-footer">
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es-CL", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit",
                  minute: "2-digit", hour12: false,
                })}</time>
                <MessageReadStatus read={read} />
                <button type="button" className="notification-delete-action"
                  disabled={deletingId !== null}
                  aria-label={`Eliminar notificación ${item.title}`} title="Eliminar para todos"
                  onClick={() => void deleteSent(item.id)}>
                  <FiTrash2 aria-hidden="true" />
                </button>
              </footer>
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
      confirmDisabled={!form.message.trim()}
      onCancel={() => setComposerOpen(false)} onConfirm={() => void send()}>
      <div className="notification-form">
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
  const [contactLoading, setContactLoading] = useState(true);
  const [startError, setStartError] = useState("");
  const firstMessageRef = useRef<HTMLTextAreaElement>(null);
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const orderedNotifications = useMemo(() => [...notifications].reverse(), [notifications]);
  useEffect(() => {
    if (!loading && unreadCount > 0 && document.visibilityState === "visible") {
      void markAllRead();
    }
  }, [loading, markAllRead, unreadCount]);
  useEffect(() => {
    let active = true;
    void repository.treasuryContact()
      .then(contact => { if (active) setTreasuryContact(contact); })
      .catch(() => { if (active) setStartError("No fue posible cargar el contacto de Tesorería."); })
      .finally(() => { if (active) setContactLoading(false); });
    return () => { active = false; };
  }, [repository]);
  const inboxLoading = loading || (notifications.length === 0 && contactLoading);
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
        </span></div></header>
    <section className="notifications-list" data-notification-tour="messages" aria-live="polite"
      aria-busy={inboxLoading}>
      {inboxLoading && notifications.length === 0 && <NotificationLoading />}
      {!inboxLoading && notifications.length === 0 && <div className="notifications-empty-conversation">
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
        deliveryIds={orderedNotifications.map(item => item.id)}
        repository={repository} isAdmin={false} initialScrollToBottom
        notificationItems={orderedNotifications.map(item => ({ id: `notification-${item.id}`,
          createdAt: item.createdAt, content: <article
        className={`notification-card chat-bubble chat-bubble--incoming notification-card--${item.type.toLowerCase()} ${
          item.read ? "is-read" : "is-unread"}`}
        onClick={() => !item.read && void markRead(item.id)}>
        <span className="notification-card__icon"><IoNotificationsOutline aria-hidden="true" /></span>
        <div className="notification-card__content">
          <header><span className="notification-card__type">{labels[item.type]}
            <span className={`notification-card__read-status ${item.read ? "is-read" : ""}`}>
              {!item.read && <button type="button" className="notification-card__read-action"
                aria-label="Marcar como leída" onClick={event => {
                  event.stopPropagation(); void markRead(item.id);
                }}>Marcar como leído</button>}
              <MessageReadStatus read={item.read} />
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
          <p>{item.message}</p>
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
