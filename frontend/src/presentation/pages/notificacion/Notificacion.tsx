

import { useNotifications } from "@/presentation/context/NotificationContext";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import type { NotificationReply, NotificationType, SentNotification } from
  "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from
  "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FiCheckCircle, FiChevronDown, FiHelpCircle, FiRefreshCw, FiSend, FiTrash2, FiUsers, FiXCircle } from "react-icons/fi";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { IoNotificationsOutline } from "react-icons/io5";
import { MdDoneAll } from "react-icons/md";
import "./Notificacion.css";
import { NotificationTour, OPEN_NOTIFICATION_TOUR_EVENT } from "./NotificationTour";

const labels = { INFO: "Informativa", IMPORTANT: "Importante", URGENT: "Urgente" };

const NotificationConversation = ({ deliveryId, repository, isAdmin, notificationItems }: {
  deliveryId: number; repository: NotificationRepositoryImpl; isAdmin: boolean;
  notificationItems: Array<{ id: string; createdAt: string; content: ReactNode }>;
}) => {
  const [messages, setMessages] = useState<NotificationReply[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true); setError("");
    try { setMessages(await repository.listReplies(deliveryId)); setLoaded(true); }
    catch { setError("No fue posible cargar la conversación."); }
    finally { setLoading(false); }
  }, [deliveryId, loading, repository]);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);
  const submit = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true); setError("");
    try {
      const saved = await repository.reply(deliveryId, message);
      setMessages(current => [...current, saved]); setDraft(""); setLoaded(true);
    } catch { setError("No fue posible enviar la respuesta."); }
    finally { setSending(false); }
  };
  const timeline = [
    ...notificationItems.map(item => ({ ...item, kind: "notification" as const })),
    ...messages.map(message => ({ id: `reply-${message.id}`, createdAt: message.createdAt,
      kind: "reply" as const, message })),
  ].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = timelineRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [timeline.length]);
  return <div className="notification-conversation">
    <div className="notification-conversation__content">
      {loading && <p className="notification-conversation__state">Cargando conversación…</p>}
      <div ref={timelineRef}
        className={`notification-conversation__messages ${isAdmin ? "sent-user-group__messages" : ""}`}
        onScroll={event => updateMessageVisibility(event.currentTarget)}>
      {timeline.map(item => item.kind === "notification" ? <div key={item.id}
        className="notification-timeline-item">{item.content}</div> : <article key={item.id}
        className={`notification-reply ${item.message.authorRole === "ADMIN" ? "is-admin" : "is-guardian"}`}>
        <header><strong>{item.message.authorRole === "ADMIN" ? "Tesorería" : item.message.authorName}</strong>
          <time dateTime={item.message.createdAt}>{new Date(item.message.createdAt).toLocaleString("es-CL", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
          })}</time></header><p>{item.message.message}</p>
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
        <button type="submit" disabled={!draft.trim() || sending}><FiSend />
          {sending ? "Enviando…" : "Responder"}</button>
      </form>
    </div>
  </div>;
};

const deleteTooltipAnchor = (rect: DOMRect) => {
  const width = Math.min(155, window.innerWidth - 16);
  const height = 90;
  const top = rect.top >= height + 8 ? rect.top - height - 8
    : Math.min(rect.bottom + 8, window.innerHeight - height - 8);
  return {
    top: Math.max(8, top),
    left: Math.max(8, Math.min(rect.right - width + 8,
      window.innerWidth - width - 8)),
  };
};

const updateMessageVisibility = (container: HTMLElement) => {
  const bounds = container.getBoundingClientRect();
  container.querySelectorAll<HTMLElement>(".sent-notification, .notification-card").forEach(message => {
    const rect = message.getBoundingClientRect();
    const visualBottom = rect.bottom + 16;
    const visualHeight = rect.height + 16;
    const visibleHeight = Math.max(0, Math.min(visualBottom, bounds.bottom)
      - Math.max(rect.top, bounds.top));
    const ratio = Math.min(1, visibleHeight / Math.max(1, visualHeight));
    const visibility = ratio >= .96 ? 1 : Math.max(.16, ratio * .82);
    message.style.setProperty("--message-visibility", String(visibility));
    message.style.setProperty("--message-blur", `${(1 - ratio) * 3.5}px`);
    message.style.setProperty("--message-scale", String(.975 + ratio * .025));
  });
};

export const Notificacion = () => {
  const auth = useOptionalAuth();
  if (!auth?.user) return null;
  if (auth.user.rol === "ADMIN") return <AdminNotificationCenter />;
  return <><GuardianInbox /><NotificationTour user={auth.user} /></>;
};

const AdminNotificationCenter = () => {
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
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SentNotification | null>(null);
  const [deleteAnchor, setDeleteAnchor] = useState<{ top: number; left: number }>();
  const [recipientsOpen, setRecipientsOpen] = useState(false);
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

  const deleteSent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await repository.deleteSent(deleteTarget.id);
      setSent(items => items.filter(item => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteAnchor(undefined);
      setAlert({ open: true, message: "Notificación eliminada correctamente.", type: "success" });
    } catch {
      setAlert({ open: true, message: "No fue posible eliminar la notificación.", type: "error" });
    } finally { setDeleting(false); }
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
        <FiChevronDown className="notification-recipient-summary__chevron" aria-hidden="true" />
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
        {!sentLoading && !sentByRecipient.length && <p className="notifications-empty">
          Todavía no has enviado notificaciones.</p>}
        {sentByRecipient.map(group => <details key={group.userId} className="sent-user-group"
          onToggle={event => {
            if (!event.currentTarget.open) return;
            const groupElement = event.currentTarget;
            window.requestAnimationFrame(() => {
              const messages = groupElement.querySelector<HTMLElement>(".sent-user-group__messages");
              if (messages) {
                messages.scrollTop = messages.scrollHeight;
                updateMessageVisibility(messages);
              }
            });
          }}>
          <summary><UserAvatar className="sent-user-group__avatar" fallbackName={group.name}
            user={{ nombre: group.name,
              profileImageType: group.profileImageType === "PREDEFINED_AVATAR"
                ? "PREDEFINED_AVATAR" : "INITIALS",
              profileImageUrl: group.profileImageUrl }} /><span><strong>{group.name}</strong>
            <small>{group.email}</small></span><em>{group.messages.length}
              {group.messages.length === 1 ? " mensaje" : " mensajes"}</em>
            <FiChevronDown aria-hidden="true" /></summary>
          {group.messages.length > 0 && <NotificationConversation
            deliveryId={group.messages[group.messages.length - 1].deliveryId}
            repository={repository} isAdmin notificationItems={group.messages.map(({
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
                  aria-label={`Eliminar notificación ${item.title}`}
                  title="Eliminar notificación" onClick={event => {
                    setDeleteAnchor(deleteTooltipAnchor(event.currentTarget.getBoundingClientRect()));
                    setDeleteTarget(item);
                  }}>
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
    <ModalConfirm isOpen={deleteTarget !== null} title="Eliminar notificación" compact
      anchor={deleteAnchor} containerClassName="notification-delete-confirm"
      message={`¿Seguro que deseas eliminar “${deleteTarget?.title ?? ""}”? Se quitará para todos sus destinatarios.`}
      confirmLabel="Sí, eliminar" confirmVariant="danger" isLoading={deleting}
      confirmIcon={<FiTrash2 />} onCancel={() => { if (!deleting) {
        setDeleteTarget(null); setDeleteAnchor(undefined);
      } }}
      onConfirm={() => void deleteSent()} />
    <ModalAlert isOpen={alert.open} message={alert.message} type={alert.type}
      variant={alert.type === "success" ? "toast" : "modal"}
      autoCloseTime={alert.type === "success" ? 2500 : 0}
      onClose={() => setAlert(value => ({ ...value, open: false }))} />
  </main>;
};

const GuardianInbox = () => {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh,
    deleteNotification } = useNotifications();
  const [deleteTarget, setDeleteTarget] = useState<(typeof notifications)[number] | null>(null);
  const [deleteAnchor, setDeleteAnchor] = useState<{ top: number; left: number }>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const autoReadRequested = useRef(false);
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const orderedNotifications = useMemo(() => [...notifications].reverse(), [notifications]);
  useEffect(() => {
    if (!loading && unreadCount > 0 && !autoReadRequested.current) {
      autoReadRequested.current = true;
      void markAllRead();
    }
  }, [loading, markAllRead, unreadCount]);
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
    <section className="notifications-list" data-notification-tour="messages" aria-live="polite">
      {!loading && notifications.length === 0 && <p className="notifications-empty">
        No tienes notificaciones.</p>}
      {orderedNotifications.length > 0 && <NotificationConversation
        deliveryId={orderedNotifications[orderedNotifications.length - 1].id}
        repository={repository} isAdmin={false}
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
              {item.read && <MdDoneAll aria-label="Leída" />}
            </span>
          </span><time dateTime={item.createdAt}>
            {new Date(item.createdAt).toLocaleString("es-CL", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              hour12: false,
            })}</time></header>
          <h2>{item.title}</h2><p>{item.message}</p>
        </div>
        <button type="button" className="notification-delete-action"
          aria-label={`Eliminar notificación ${item.title}`} title="Eliminar notificación"
          onClick={event => { event.stopPropagation();
            setDeleteAnchor(deleteTooltipAnchor(event.currentTarget.getBoundingClientRect()));
            setDeleteTarget(item);
          }}>
          <FiTrash2 aria-hidden="true" />
        </button>
      </article> }))} />}
    </section>
    <ModalConfirm isOpen={deleteTarget !== null} title="Eliminar notificación" compact
      anchor={deleteAnchor} containerClassName="notification-delete-confirm"
      message={`¿Seguro que deseas eliminar “${deleteTarget?.title ?? ""}”? Esta acción no se puede deshacer.`}
      confirmLabel="Sí, eliminar" confirmVariant="danger" isLoading={deleting}
      confirmIcon={<FiTrash2 />} onCancel={() => { if (!deleting) {
        setDeleteTarget(null); setDeleteAnchor(undefined);
      } }}
      onConfirm={() => {
        if (!deleteTarget) return;
        setDeleting(true);
        void deleteNotification(deleteTarget.id).then(() => {
          setDeleteTarget(null); setDeleteAnchor(undefined);
        })
          .catch(() => setDeleteError(true))
          .finally(() => setDeleting(false));
      }} />
    <ModalAlert isOpen={deleteError} message="No fue posible eliminar la notificación."
      type="error" onClose={() => setDeleteError(false)} />
  </main>;
};
