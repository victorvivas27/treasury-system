import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FiEdit2, FiSend, FiTrash2 } from "react-icons/fi";
import type { NotificationReply } from "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useRealtime } from "@/presentation/context/RealtimeContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";
import { useDashboardResource } from "../dashboard/dashboardCache";
import { notificationCache } from "./notificationCache";
import { MessageReadStatus } from "./MessageReadStatus";
import { MessageEditModal } from "./MessageEditModal";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";

export const NotificationConversation = ({ deliveryId, deliveryIds, repository, isAdmin, notificationItems, recipientName,
  active = true, initialScrollToBottom = false }: {
  deliveryId: number; deliveryIds: number[]; repository: NotificationRepositoryImpl; isAdmin: boolean;
  notificationItems: Array<{ id: string; createdAt: string; content: ReactNode }>;
  recipientName: string;
  active?: boolean;
  initialScrollToBottom?: boolean;
}) => {
  const { subscribeMessages, registerActiveThread } = useRealtime();
  const auth = useOptionalAuth();
  const resource = useMemo(() => notificationCache(auth?.user?.id ?? 0).thread(deliveryId), [auth?.user?.id, deliveryId]);
  const cached = useDashboardResource(resource, false);
  const messages = cached.data ?? [];
  const setMessages = useCallback((update: (items: NotificationReply[]) => NotificationReply[]) => {
    const current = resource.getSnapshot().data;
    if (current !== undefined) resource.set(update(current));
  }, [resource]);
  const [draft, setDraft] = useState("");
  const loaded = cached.data !== undefined;
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const input = composerRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(96, Math.max(40, input.scrollHeight))}px`;
  }, [draft]);
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
  const renderedTimelineLength = useRef(0);
  const load = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true); setError("");
    try {
      const previous = resource.getSnapshot().data;
      await resource.load(force);
      const state = resource.getSnapshot();
      if (state.error || !state.data) throw state.failure;
      if (state.data !== previous) setMessages(() => state.data!.map(withReadReceipt));
    }
    catch { setError("No fue posible cargar la conversación."); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [resource, setMessages, withReadReceipt]);
  useEffect(() => {
    const refreshVisible = () => {
      if (active && document.visibilityState === "visible") void load(true);
    };
    if (active && document.visibilityState === "visible") void load();
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
    if (resource.getSnapshot().data === undefined) {
      resource.invalidate();
      if (active) void load(true);
      return;
    }
    const reply = withReadReceipt(event.reply);
    setMessages(current => current.some(item => item.id === reply.id)
      ? current : [...current, reply]);
    if (active && document.visibilityState === "visible" && reply.authorId !== auth?.user?.id) {
      void resource.load(true).then(() => {
        const state = resource.getSnapshot();
        if (state.error) throw state.failure;
        setMessages(() => (state.data ?? []).map(withReadReceipt));
      })
        .catch(() => setError("No fue posible actualizar la lectura del mensaje."));
    }
  }), [active, auth?.user?.id, deliveryId, deliveryIds, repository, subscribeMessages, withReadReceipt, resource, setMessages, load]);
  const submit = async () => {
    const message = draft.trim();
    if (!message || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true); setError("");
    try {
      const saved = withReadReceipt(await repository.reply(deliveryId, message));
      nearBottom.current = true;
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
    if (!isInitialPosition && !nearBottom.current) return;
    const hasOverflow = container.scrollHeight > container.clientHeight + 8;
    container.scrollTop = hasOverflow ? container.scrollHeight : 0;
  }, [initialScrollToBottom, loaded, timeline.length]);
  const initialLoading = !loaded && !error;
  const panel = <div className="notification-conversation">
    {!isAdmin && <header className="notification-conversation__heading"><div><strong>Conversación con {recipientName}</strong><small>Tesorería del curso</small></div></header>}
    <div inert={initialLoading && active} className="notification-conversation__content">
      <div ref={timelineRef} aria-busy={initialLoading} tabIndex={0}
        role="log" aria-label="Historial de mensajes" aria-live="polite"
        onScroll={event => {
          const current = event.currentTarget;
          nearBottom.current = current.scrollHeight - current.clientHeight - current.scrollTop < 64;
        }}
        className={`notification-conversation__messages ${isAdmin ? "sent-user-group__messages" : ""}`}>
      {!initialLoading && timeline.map(item => item.kind === "notification" ? <div key={item.id}
        className="notification-timeline-item">{item.content}</div> : <article key={item.id}
        aria-label={auth?.user?.id === item.message.authorId ? "Mensaje enviado" : `Mensaje de ${item.message.authorName}`}
        className={`notification-reply ${isAdminRole(item.message.authorRole) ? "is-admin" : "is-guardian"} ${auth?.user?.id === item.message.authorId ? "is-own" : "is-received"}`}>
        <header>
          <strong className="notification-message-author"><UserAvatar className="notification-message-avatar"
            user={{ nombre: item.message.authorName, profileImageType: item.message.authorProfileImageType,
              profileImageUrl: item.message.authorProfileImageUrl }} customImageUserId={item.message.authorId} />
            <span>{auth?.user?.id === item.message.authorId ? "Tú" : item.message.authorName}
            {isAdminRole(item.message.authorRole) && <small> · Tesorería</small>}
            </span>
          </strong>
          <span className="notification-reply__meta"><MessageReadStatus read={item.message.read} /><time dateTime={item.message.createdAt}>{new Date(item.message.createdAt).toLocaleString("es-CL", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
          })}</time>
        {auth?.user?.id === item.message.authorId
          && <span className="notification-reply__actions">
            {Date.now() - new Date(item.message.createdAt).getTime() <= 15 * 60 * 1000
              && <button type="button" onClick={event => { setEditingId(item.message.id);
                setEditAnchor(event.currentTarget.closest("article")); }}><FiEdit2 /> Editar</button>}
            <button type="button" onClick={() => void deleteMessage(item.message.id)}>
              <FiTrash2 /> Eliminar</button>
          </span>}
          </span></header>
        <p>{item.message.message}</p>

      </article>)}
      </div>
      {error && <p className="notification-conversation__error">{error}</p>}
      {error && !loaded && <button type="button" disabled={loading} onClick={() => void load()}>
        Reintentar carga de conversación</button>}
      <form className="notification-reply-form" onSubmit={event => {
        event.preventDefault(); void submit();
      }}>
        <span className="notification-composer-recipient">Enviar a <strong>{recipientName}</strong></span>
        <textarea ref={composerRef} disabled={initialLoading || sending} aria-label={isAdmin ? "Responder al apoderado" : "Responder a administración"}
          placeholder={isAdmin ? "Escribe una respuesta al apoderado…" : "Escribe una respuesta a administración…"}
          maxLength={2000} rows={1} value={draft}
          onChange={event => setDraft(event.target.value)} />
        <button type="submit" aria-label={`Enviar a ${recipientName}`} title={`Enviar a ${recipientName}`} aria-busy={sending}
          disabled={initialLoading || !draft.trim() || sending}><FiSend aria-hidden="true" />
          <span className="notification-composer__send-label">{sending ? "Enviando…" : "Responder"}</span></button>
      </form>
    </div>
    {initialLoading && active && <LoadingState message="Preparando la conversación" variant="contained" delayMs={180} />}
  </div>;
  const editedMessage = messages.find(message => message.id === editingId);
  return <>
    {panel}
    {editedMessage && <MessageEditModal key={editedMessage.id} message={editedMessage.message}
      anchor={editAnchor} onSave={editMessage} onClose={() => setEditingId(null)} />}
  </>;
};

