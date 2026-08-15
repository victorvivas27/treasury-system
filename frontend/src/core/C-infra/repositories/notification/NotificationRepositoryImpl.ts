import type { AppNotification, SendNotificationPayload, SentNotification } from
  "@/core/A-domain/entities/notification/Notification";
import { apiClient } from "@/core/D-config/api";

export class NotificationRepositoryImpl {
  async listMine(): Promise<AppNotification[]> {
    return (await apiClient.get<AppNotification[]>("/notifications/me")).data;
  }
  async unreadCount(): Promise<number> {
    return (await apiClient.get<{ count: number }>("/notifications/me/unread-count")).data.count;
  }
  async markRead(id: number): Promise<AppNotification> {
    return (await apiClient.patch<AppNotification>(`/notifications/${id}/read`)).data;
  }
  async markAllRead(): Promise<void> { await apiClient.patch("/notifications/read-all"); }
  async send(payload: SendNotificationPayload): Promise<number> {
    return (await apiClient.post<{ recipientCount: number }>("/notifications", payload))
      .data.recipientCount;
  }
  async listSent(): Promise<SentNotification[]> {
    return (await apiClient.get<SentNotification[]>("/notifications/sent")).data;
  }
}
