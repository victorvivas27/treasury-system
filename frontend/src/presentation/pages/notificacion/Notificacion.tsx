import { useNotifications } from "@/presentation/context/NotificationContext";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useNotificationRecipients } from "./useNotificationRecipients";
import { notificationCache } from "./notificationCache";
import { useDashboardResource } from "../dashboard/dashboardCache";
import { LoadingState } from "@/shared/ui/loading/LoadingState";
import type { NotificationType, SentNotification } from
  "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from
  "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { FiSend,
  FiTrash2, FiUsers } from "react-icons/fi";
import { FcExpand } from "react-icons/fc";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { IoNotificationsOutline } from "react-icons/io5";
import "./Notificacion.css";
import "./NotificationMessenger.css";
import { NotificationConversation } from "./NotificationConversation";
import { MessageReadStatus } from "./MessageReadStatus";

const labels = { INFO: "Informativa", IMPORTANT: "Importante", URGENT: "Urgente" };

export const Notificacion = () => {
  const auth = useOptionalAuth();
  if (!auth?.user) return null;
  if (isAdminRole(auth.user.rol)) return <AdminNotificationCenter key={auth.user.id} />;
  return <GuardianInbox key={auth.user.id} />;
};

const AdminNotificationCenter = () => {
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const auth = useOptionalAuth();
  const cache = useMemo(() => notificationCache(auth?.user?.id ?? 0), [auth?.user?.id]);
  const { apoderados, loading, error, currentPage, nextPage, prevPage, hasPrevPage,
    isLastPage, search, setSearch, retry } = useNotificationRecipients(recipientsOpen);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedNames, setSelectedNames] = useState<Map<number, string>>(new Map());
  const [selectAll, setSelectAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ message: "", type: "INFO" as NotificationType });
  const [alert, setAlert] = useState({ open: false, message: "", type: "success" as "success" | "error" });
  const sentState = useDashboardResource(cache.sent);
  const sent = sentState.data ?? [];
  const sentLoading = !sentState.data && !sentState.error;
  const sentError = sentState.error;
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | undefined>(cache.selection.contactId);
  const [contactSearch, setContactSearch] = useState("");
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
  const activeGroup = sentByRecipient.find(group => group.userId === selectedContactId);
  const visibleContacts = sentByRecipient.filter(group =>
    `${group.name} ${group.email}`.toLocaleLowerCase("es").includes(contactSearch.trim().toLocaleLowerCase("es")));
  const loadSent = useCallback(() => cache.sent.load(true), [cache.sent]);
  useEffect(() => {
    const refreshSent = () => { void loadSent(); };
    window.addEventListener("notification-realtime-received", refreshSent);
    return () => window.removeEventListener("notification-realtime-received", refreshSent);
  }, [loadSent]);
  const toggle = (id: number, name: string, checked: boolean) => {
    setSelectedNames(current => {
      const next = new Map(current); if (checked) next.set(id, name); else next.delete(id); return next;
    });
    setSelectedIds(current => {
    const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next;
    });
  };
  const send = async () => {
    if (!form.message.trim() || (!selectAll && !selectedIds.size)) return;
    setSending(true);
    try {
      const count = await repository.send({ ...form,
        title: "Mensaje de Tesorería", message: form.message.trim(), recipientIds: [...selectedIds],
        sendToAll: selectAll });
      setComposerOpen(false); setSelectedIds(new Set()); setSelectAll(false);
      setSelectedNames(new Map());
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
      cache.sent.set((cache.sent.getSnapshot().data ?? []).filter(item => item.id !== id));
    } catch {
      setAlert({ open: true, message: "No fue posible eliminar la notificación.", type: "error" });
    } finally { setDeletingId(null); }
  };

  return <>
    {sentLoading && <LoadingState message="Preparando las notificaciones" />}
    <main inert={sentLoading} aria-busy={sentLoading} className="page-container notifications-page notifications-admin">
      <div className="notification-admin-actions">
        <Button label="Crear notificación"
          icon={<IoNotificationsOutline />} iconPosition="left"
          disabled={!selectAll && selectedIds.size === 0}
          onClick={() => setComposerOpen(true)} />
      </div>
    <details className="notification-recipient-panel" open={recipientsOpen}
      onToggle={event => setRecipientsOpen(event.currentTarget.open)}>
      <summary className="notification-recipient-summary"><FiUsers aria-hidden="true" />
        <span>Apoderados destinatarios</span><small>{apoderados.length ? `${apoderados.length} en esta página` : "Ver destinatarios"}</small>
        <FcExpand className="notification-recipient-summary__chevron" aria-hidden="true" />
      </summary>
      <div className="notification-recipient-content">
      <header className="notification-recipient-toolbar">
        <label><input type="checkbox" checked={selectAll} onChange={event => {
          setSelectAll(event.target.checked); if (event.target.checked) { setSelectedIds(new Set()); setSelectedNames(new Map()); }
        }} /> Seleccionar todos los apoderados</label>
        <input type="search" value={search} placeholder="Buscar apoderado" aria-label="Buscar apoderado"
          onChange={event => setSearch(event.target.value)} />
      </header>
      {error && <div role="alert" className="notification-recipient-error">{error}<button type="button" onClick={() => void retry()}>Reintentar destinatarios</button></div>}
      {loading && recipientsOpen && <LoadingState message="Preparando los destinatarios" />}
      <div className="notification-recipient-list">
        {apoderados.map(apoderado => <article key={apoderado.apoderadoId}
          className={`notification-recipient ${selectAll || selectedIds.has(apoderado.apoderadoId)
            ? "is-selected" : ""}`}>
          <input type="checkbox" disabled={selectAll}
            aria-label={`Seleccionar a ${apoderado.nombre}`}
            checked={selectAll || selectedIds.has(apoderado.apoderadoId)}
            onChange={event => toggle(apoderado.apoderadoId, apoderado.nombre, event.target.checked)} />
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
      {sentError && <div role="alert" className="notification-conversation__error">
        No fue posible cargar los mensajes.
        <button type="button" onClick={() => void loadSent()}>Reintentar carga de mensajes</button>
      </div>}
      <div className={`notification-messenger ${activeGroup ? "has-active-chat" : ""}`}>
        <aside className="notification-contacts" aria-label="Conversaciones con apoderados">
          <header><h3>Mensajes</h3><span>{sentByRecipient.length}</span></header>
          <label className="notification-contact-search"><span>Buscar conversación</span>
            <input type="search" value={contactSearch} placeholder="Nombre o correo"
              onChange={event => setContactSearch(event.target.value)} /></label>
          <div className="notification-contact-list">
            {visibleContacts.map(group => <button type="button" key={group.userId}
              className={`notification-contact ${activeGroup?.userId === group.userId ? "is-selected" : ""}`}
              aria-pressed={activeGroup?.userId === group.userId}
              onClick={() => { setSelectedContactId(group.userId); cache.selection.contactId = group.userId; }}>
              <UserAvatar className="notification-contact__avatar" fallbackName={group.name}
                user={{ nombre: group.name, profileImageType: group.profileImageType, profileImageUrl: group.profileImageUrl }}
                customImageUserId={group.userId} />
              <span><strong className="notification-contact__name">{group.name}</strong>
                <small>{group.messages[group.messages.length - 1]?.notification.message}</small></span>
              <span className="notification-contact__count">{group.messages.length}</span>
            </button>)}
            {!sentLoading && !sentError && !sentByRecipient.length && <p className="notification-contact-empty">Todavía no has enviado notificaciones</p>}
            {sentByRecipient.length > 0 && !visibleContacts.length && <p className="notification-contact-empty">No hay conversaciones para esta búsqueda.</p>}
          </div>
        </aside>
        <section className="notification-chat-panel" aria-label="Conversación seleccionada">
          {activeGroup ? <>
            <header className="notification-chat-header">
              <button type="button" className="notification-chat-back" onClick={() => { setSelectedContactId(undefined); cache.selection.contactId = undefined; }}>Contactos</button>
              <UserAvatar fallbackName={activeGroup.name}
                user={{ nombre: activeGroup.name, profileImageType: activeGroup.profileImageType, profileImageUrl: activeGroup.profileImageUrl }}
                customImageUserId={activeGroup.userId} />
              <div><strong>Conversación con {activeGroup.name}</strong><small>Apoderado · {activeGroup.email}</small></div>
            </header>
            <NotificationConversation key={activeGroup.userId}
              deliveryId={activeGroup.messages[activeGroup.messages.length - 1].deliveryId}
              deliveryIds={activeGroup.messages.map(item => item.deliveryId)}
              repository={repository} isAdmin initialScrollToBottom recipientName={activeGroup.name}
            notificationItems={activeGroup.messages.map(({
              notification: item, read }) => ({ id: `notification-${item.id}`,
              createdAt: item.createdAt, content: <article
              className={`sent-notification chat-bubble chat-bubble--outgoing sent-notification--${
                item.type.toLowerCase()}`}>
              <header className="sent-notification__message-meta">
                <strong className="notification-message-author"><UserAvatar className="notification-message-avatar"
                  user={auth?.user ?? null} /><span>Tú <small>· Tesorería</small></span></strong>
                <MessageReadStatus read={read} />
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es-CL", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit",
                  minute: "2-digit", hour12: false,
                })}</time>
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
            </article> }))} />
          </> : <div className="notification-chat-placeholder"><IoNotificationsOutline aria-hidden="true" />
            <h3>Tus conversaciones</h3><p>Elige un contacto para leer y responder sus mensajes.</p></div>}
        </section>
      </div>
    </section>
    <ModalConfirm isOpen={composerOpen} title="Nueva notificación"
      containerClassName="notification-compose-modal"
      message={selectAll ? "Enviar a todos los apoderados con acceso."
        : selectedIds.size === 1 ? `Enviar a ${[...selectedNames.values()][0]}.`
          : `Enviar a ${selectedIds.size} apoderados.`}
      confirmLabel="Enviar" isLoading={sending} compact
      confirmIcon={<FiSend />}
      confirmDisabled={!form.message.trim()}
      onCancel={() => setComposerOpen(false)} onConfirm={() => void send()}>
      {!selectAll && selectedIds.size > 1 && <details className="notification-compose-recipients">
        <summary>Ver destinatarios ({selectedIds.size})</summary>
        <ul>{[...selectedNames].map(([id, name]) => <li key={id}>{name}</li>)}</ul>
      </details>}
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
  </main></>;
};

const GuardianInbox = () => {
  const { notifications, unreadCount, loading, error: inboxError, markRead, markAllRead, refresh,
    deleteNotification } = useNotifications();
  const [deleteError, setDeleteError] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const auth = useOptionalAuth();
  const contactResource = useMemo(() => notificationCache(auth?.user?.id ?? 0).contact, [auth?.user?.id]);
  const contact = useDashboardResource(contactResource, !loading && notifications.length === 0);
  const treasuryContact = contact.data;
  const contactLoading = !contact.data && !contact.error;
  const [startingConversation, setStartingConversation] = useState(false);
  const [startError, setStartError] = useState("");
  const firstMessageRef = useRef<HTMLTextAreaElement>(null);
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const orderedNotifications = useMemo(() => [...notifications].reverse(), [notifications]);
  const recipientName = orderedNotifications[orderedNotifications.length - 1]?.senderName || treasuryContact?.name || "Tesorería";
  useEffect(() => {
    if (!loading && unreadCount > 0 && document.visibilityState === "visible") {
      void markAllRead().catch(() => setStartError("No fue posible actualizar la lectura de los mensajes."));
    }
  }, [loading, markAllRead, unreadCount]);
  const inboxLoading = (loading && notifications.length === 0) || (notifications.length === 0 && contactLoading);
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
  return <>
    {inboxLoading && <LoadingState message="Preparando las notificaciones" />}
    <main inert={inboxLoading} aria-busy={inboxLoading} className="page-container notifications-page notifications-inbox">
    {startError && notifications.length > 0 && <p role="alert" className="notification-conversation__error">{startError}</p>}
    {inboxError && <div role="alert" className="notification-conversation__error">{inboxError}<button type="button" onClick={() => void refresh()}>Reintentar notificaciones</button></div>}
    <section className="notifications-list" aria-live="polite"
      aria-busy={inboxLoading}>
      {!inboxLoading && !inboxError && notifications.length === 0 && <div className="notifications-empty-conversation">
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
        <h2>Conversación con {recipientName}</h2>
        <p className="notifications-empty-conversation__state">Aún no hay mensajes con Tesorería.</p>
        {contact.error && <div role="alert" className="notification-conversation__error">No fue posible cargar el contacto de Tesorería.<button type="button" onClick={() => void contactResource.load(true)}>Reintentar contacto</button></div>}
        {startError && <p className="notification-conversation__error">{startError}</p>}
        <form className="notification-reply-form" onSubmit={event => {
          event.preventDefault(); void startConversation();
        }}>
          <span className="notification-composer-recipient">Enviar a <strong>{recipientName}</strong> · Tesorería del curso</span>
          <textarea ref={firstMessageRef} maxLength={2000} value={firstMessage}
            onChange={event => setFirstMessage(event.target.value)}
            placeholder="Escribe un mensaje a Tesorería" aria-label="Mensaje para Tesorería" />
          <button type="submit" aria-label={`Enviar a ${recipientName}`} disabled={!firstMessage.trim() || startingConversation}>
            <FiSend /> {startingConversation ? "Enviando…" : "Enviar"}
          </button>
        </form>
        </section>
      </div>}
      {orderedNotifications.length > 0 && <NotificationConversation
        key={orderedNotifications[orderedNotifications.length - 1].id}
        deliveryId={orderedNotifications[orderedNotifications.length - 1].id}
        deliveryIds={orderedNotifications.map(item => item.id)}
        repository={repository} isAdmin={false} initialScrollToBottom recipientName={recipientName}
        notificationItems={orderedNotifications.map(item => ({ id: `notification-${item.id}`,
          createdAt: item.createdAt, content: <article
        className={`notification-card chat-bubble chat-bubble--incoming notification-card--${item.type.toLowerCase()} ${
          item.read ? "is-read" : "is-unread"}`}
        onClick={() => !item.read && void markRead(item.id).catch(() => setStartError("No fue posible marcar el mensaje como leído."))}>
        <span className="notification-card__icon"><IoNotificationsOutline aria-hidden="true" /></span>
        <div className="notification-card__content">
          <strong className="notification-message-author"><UserAvatar className="notification-message-avatar"
            user={{ nombre: item.senderName || "Tesorería", profileImageType: item.senderProfileImageType,
              profileImageUrl: item.senderProfileImageUrl }} customImageUserId={item.senderId} />
            <span>{item.senderName || "Tesorería"}<small> · Tesorería</small></span></strong>
          <header><span className="notification-card__type">{labels[item.type]}
            <span className={`notification-card__read-status ${item.read ? "is-read" : ""}`}>
              {!item.read && <button type="button" className="notification-card__read-action"
                aria-label="Marcar como leída" onClick={event => {
                  event.stopPropagation(); void markRead(item.id).catch(() => setStartError("No fue posible marcar el mensaje como leído."));
                }}>Marcar como leído</button>}
              <MessageReadStatus read={item.read} />
            </span>
          </span><time dateTime={item.createdAt}>
            {new Date(item.createdAt).toLocaleString("es-CL", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              hour12: false,
            })}</time></header>
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
  </main></>;
};
