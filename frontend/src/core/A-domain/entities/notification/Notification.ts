export type NotificationType = "INFO" | "IMPORTANT" | "URGENT";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface SendNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  recipientIds: number[];
  sendToAll: boolean;
}

export interface SentNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  recipients: Array<{
    userId: number;
    name: string;
    email: string;
    read: boolean;
    readAt: string | null;
  }>;
}
