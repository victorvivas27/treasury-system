import type { AppNotification } from "@/core/A-domain/entities/notification/Notification";
import { NotificationRepositoryImpl } from
  "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { useOptionalAuth } from "./AuthContext";
import { createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode } from "react";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const auth = useOptionalAuth();
  const repository = useMemo(() => new NotificationRepositoryImpl(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth?.isAuthenticated) return;
    setLoading(true);
    try {
      const [items, count] = await Promise.all([repository.listMine(), repository.unreadCount()]);
      setNotifications(items); setUnreadCount(count);
    } finally { setLoading(false); }
  }, [auth?.isAuthenticated, repository]);

  useEffect(() => {
    if (!auth?.isAuthenticated) { setNotifications([]); setUnreadCount(0); return; }
    void refresh();
    const timer = window.setInterval(() => void repository.unreadCount()
      .then(setUnreadCount).catch(() => undefined), 60_000);
    const visible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [auth?.isAuthenticated, refresh, repository]);

  const markRead = async (id: number) => {
    const updated = await repository.markRead(id);
    setNotifications(items => items.map(item => item.id === id ? updated : item));
    setUnreadCount(count => updated.read ? Math.max(0, count - 1) : count);
  };
  const markAllRead = async () => {
    await repository.markAllRead();
    setNotifications(items => items.map(item => ({ ...item, read: true })));
    setUnreadCount(0);
  };
  return <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh,
    markRead, markAllRead }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  return value;
};

export const useOptionalNotifications = () => useContext(NotificationContext);
