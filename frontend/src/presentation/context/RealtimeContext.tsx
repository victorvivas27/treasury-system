import type { NotificationReply } from "@/core/A-domain/entities/notification/Notification";
import { apiClient } from "@/core/D-config/api";
import { Client, type IMessage } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef,
  useState, type ReactNode } from "react";
import { useOptionalAuth } from "./AuthContext";

export interface NotificationReplyEvent {
  deliveryId?: number;
  reply?: NotificationReply;
  deletedMessageId?: number;
}
type MessageHandler = (message: NotificationReplyEvent) => void;
interface RealtimeValue {
  connected: boolean;
  sendNotificationReply: (deliveryId: number, message: string) => void;
  subscribeMessages: (handler: MessageHandler) => () => void;
  registerActiveThread: (deliveryId: number) => () => void;
}
const RealtimeContext = createContext<RealtimeValue | undefined>(undefined);

const websocketUrl = () => {
  const url = new URL(String(apiClient.defaults.baseURL));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = url.pathname.replace(/\/api\/v1\/?$/, "/ws");
  url.search = "";
  return url.toString();
};

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const auth = useOptionalAuth();
  const clientRef = useRef<Client | null>(null);
  const handlers = useRef(new Set<MessageHandler>());
  const activeThreads = useRef(new Set<number>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!auth?.token || !auth.isAuthenticated) return;
    const client = new Client({ brokerURL: websocketUrl(), reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${auth.token}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe("/user/queue/messages", (frame: IMessage) => {
          const event = JSON.parse(frame.body) as NotificationReplyEvent;
          handlers.current.forEach(handler => handler(event));
        });
        client.subscribe("/user/queue/notifications", (frame: IMessage) => {
          const event = JSON.parse(frame.body) as Partial<NotificationReplyEvent>;
          if (event.deliveryId !== undefined && activeThreads.current.has(event.deliveryId)) return;
          window.dispatchEvent(new Event("notification-unread-changed"));
          window.dispatchEvent(new Event("notification-realtime-received"));
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    clientRef.current = client;
    client.activate();
    return () => { clientRef.current = null; setConnected(false); void client.deactivate(); };
  }, [auth?.isAuthenticated, auth?.token]);

  const sendNotificationReply = useCallback((deliveryId: number, message: string) => {
    const client = clientRef.current;
    if (!client?.connected) throw new Error("La conexión en tiempo real no está disponible");
    client.publish({ destination: "/app/notifications.reply",
      body: JSON.stringify({ deliveryId, message }) });
  }, []);
  const subscribeMessages = useCallback((handler: MessageHandler) => {
    handlers.current.add(handler); return () => { handlers.current.delete(handler); };
  }, []);
  const registerActiveThread = useCallback((deliveryId: number) => {
    activeThreads.current.add(deliveryId);
    return () => { activeThreads.current.delete(deliveryId); };
  }, []);
  const value = useMemo(() => ({ connected, sendNotificationReply, subscribeMessages,
    registerActiveThread }),
    [connected, sendNotificationReply, subscribeMessages, registerActiveThread]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("useRealtime debe usarse dentro de RealtimeProvider");
  return value;
};
