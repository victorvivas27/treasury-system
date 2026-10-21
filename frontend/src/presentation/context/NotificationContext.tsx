import type { AppNotification } from "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from
  "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { useOptionalAuth } from "./AuthContext";
import { subscriptionPayload, syncAppBadge, urlBase64ToUint8Array } from
  "@/shared/pwa/appBadge";
import { createContext, useCallback, useContext, useEffect, useMemo, useState,
  useRef, type ReactNode } from "react";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  pushStatus: "checking" | "unsupported" | "unavailable" | "prompt" | "denied" | "enabled";
  pushLoading: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
}
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const auth = useOptionalAuth();
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const identity = `${auth?.isAuthenticated}:${auth?.user?.id}`;
  const session = useRef(identity);
  session.current = identity;
  const loadedSession = useRef<string | undefined>(undefined);
  const pendingRefresh = useRef<{ identity: string; promise: Promise<void> } | undefined>(undefined);
  const revision = useRef(0);
  const [pushStatus, setPushStatus] = useState<NotificationContextValue["pushStatus"]>("checking");
  const [pushLoading, setPushLoading] = useState(false);
  const unreadCountLoading = useRef(false);

  const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator
    && "PushManager" in window && "Notification" in window;

  const inspectPush = useCallback(async () => {
    if (!auth?.isAuthenticated) { setPushStatus("checking"); return; }
    if (!pushSupported()) { setPushStatus("unsupported"); return; }
    const config = await repository.pushConfig();
    if (!config.enabled || !config.publicKey) { setPushStatus("unavailable"); return; }
    if (Notification.permission === "denied") { setPushStatus("denied"); return; }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription && Notification.permission === "granted") {
      await repository.savePushSubscription(subscriptionPayload(subscription));
      setPushStatus("enabled");
      return;
    }
    setPushStatus("prompt");
  }, [auth?.isAuthenticated, repository]);

  const refresh = useCallback(async () => {
    if (!auth?.isAuthenticated) return;
    if (pendingRefresh.current?.identity === identity) return pendingRefresh.current.promise;
    setLoading(loadedSession.current !== identity);
    setError("");
    const requestRevision = revision.current;
    const promise = Promise.all([repository.listMine(), repository.unreadCount()]).then(([items, count]) => {
      if (session.current !== identity || revision.current !== requestRevision) return;
      setNotifications(items); setUnreadCount(count); loadedSession.current = identity;
    }).catch(() => {
      if (session.current === identity) setError("No fue posible actualizar tus notificaciones.");
    }).finally(() => {
      if (session.current === identity) setLoading(false);
      if (pendingRefresh.current?.promise === promise) pendingRefresh.current = undefined;
    });
    pendingRefresh.current = { identity, promise };
    return promise;
  }, [auth?.isAuthenticated, identity, repository]);

  const refreshUnreadCount = useCallback(async () => {
    if (!auth?.isAuthenticated || unreadCountLoading.current) return;
    if (document.visibilityState !== "visible") return;
    unreadCountLoading.current = true;
    try {
      const count = await repository.unreadCount();
      if (session.current === identity) setUnreadCount(count);
    } catch {
      // Keep the last known unread count if the refresh fails.
    } finally {
      unreadCountLoading.current = false;
    }
  }, [auth?.isAuthenticated, identity, repository]);

  useEffect(() => {
    if (!auth?.isAuthenticated) {
      setNotifications([]); setUnreadCount(0); setLoading(false); setError("");
      loadedSession.current = undefined; return;
    }
    if (loadedSession.current !== identity) { setNotifications([]); setUnreadCount(0); }
    void refresh();
    const timer = window.setInterval(() => void refreshUnreadCount(), 60_000);
    const visible = () => document.visibilityState === "visible" && void refresh();
    const unreadChanged = () => void refreshUnreadCount();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("notification-unread-changed", unreadChanged);
    const realtimeReceived = () => void refresh();
    window.addEventListener("notification-realtime-received", realtimeReceived);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("notification-unread-changed", unreadChanged);
      window.removeEventListener("notification-realtime-received", realtimeReceived);
    };
  }, [auth?.isAuthenticated, identity, refresh, refreshUnreadCount]);

  useEffect(() => {
    void syncAppBadge(auth?.isAuthenticated ? unreadCount : 0);
  }, [auth?.isAuthenticated, unreadCount]);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    const inspect = () => void inspectPush().catch(() => setPushStatus("unavailable"));
    if (document.readyState === "complete") inspect();
    else window.addEventListener("load", inspect, { once: true });
    return () => window.removeEventListener("load", inspect);
  }, [auth?.isAuthenticated, inspectPush]);

  const enablePush = async () => {
    if (!pushSupported()) throw new Error("Este dispositivo no admite notificaciones web.");
    setPushLoading(true);
    try {
      const config = await repository.pushConfig();
      if (!config.enabled || !config.publicKey) {
        setPushStatus("unavailable");
        throw new Error("El servidor todavía no tiene habilitadas las notificaciones push.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "denied" : "prompt");
        throw new Error(permission === "denied"
          ? "El permiso fue bloqueado. Debes habilitarlo desde los ajustes del dispositivo."
          : "Necesitas permitir las notificaciones para activar el contador.");
      }
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const subscription = current ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      await repository.savePushSubscription(subscriptionPayload(subscription));
      setPushStatus("enabled");
      await syncAppBadge(unreadCount);
    } finally { setPushLoading(false); }
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await repository.deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      await syncAppBadge(0);
      setPushStatus(Notification.permission === "denied" ? "denied" : "prompt");
    } finally { setPushLoading(false); }
  };

  const markRead = useCallback(async (id: number) => {
    const updated = await repository.markRead(id);
    if (session.current !== identity) return;
    revision.current += 1;
    const wasUnread = notifications.some(item => item.id === id && !item.read);
    setNotifications(items => items.map(item => item.id === id ? updated : item));
    if (wasUnread && updated.read) setUnreadCount(count => Math.max(0, count - 1));
  }, [repository, identity, notifications]);
  const markAllRead = useCallback(async () => {
    await repository.markAllRead();
    if (session.current !== identity) return;
    revision.current += 1;
    setNotifications(items => items.map(item => ({ ...item, read: true })));
    setUnreadCount(0);
  }, [repository, identity]);
  const deleteNotification = async (id: number) => {
    await repository.deleteMine(id);
    if (session.current !== identity) return;
    revision.current += 1;
    const deleted = notifications.find(item => item.id === id);
    if (deleted && !deleted.read) setUnreadCount(count => Math.max(0, count - 1));
    setNotifications(items => items.filter(item => item.id !== id));
  };
  return <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, refresh,
    markRead, markAllRead, deleteNotification, pushStatus, pushLoading, enablePush,
    disablePush }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  return value;
};

export const useOptionalNotifications = () => useContext(NotificationContext);
