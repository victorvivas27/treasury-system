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
    deliveryId: number;
    userId: number;
    name: string;
    email: string;
    read: boolean;
    readAt: string | null;
    profileImageType: "INITIALS" | "PREDEFINED_AVATAR" | "CUSTOM_IMAGE";
    profileImageUrl: string | null;
  }>;
}

export interface NotificationReply {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: "ADMIN" | "USER";
  message: string;
  createdAt: string;
}
