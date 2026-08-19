import type { AppNotification, NotificationReply, SendNotificationPayload, SentNotification } from
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
  async deleteMine(id: number): Promise<void> { await apiClient.delete(`/notifications/me/${id}`); }
  async send(payload: SendNotificationPayload): Promise<number> {
    return (await apiClient.post<{ recipientCount: number }>("/notifications", payload))
      .data.recipientCount;
  }
  async listSent(): Promise<SentNotification[]> {
    return (await apiClient.get<SentNotification[]>("/notifications/sent")).data;
  }
  async deleteSent(id: number): Promise<void> { await apiClient.delete(`/notifications/sent/${id}`); }
  async listReplies(deliveryId: number): Promise<NotificationReply[]> {
    const replies = (await apiClient.get<NotificationReply[]>(
      `/notifications/threads/${deliveryId}/messages`)).data;
    window.dispatchEvent(new Event("notification-unread-changed"));
    return replies;
  }
  async reply(deliveryId: number, message: string): Promise<NotificationReply> {
    return (await apiClient.post<NotificationReply>(
      `/notifications/threads/${deliveryId}/messages`, { message })).data;
  }
  async editReply(id: number, message: string): Promise<NotificationReply> {
    return (await apiClient.patch<NotificationReply>(`/notifications/messages/${id}`, { message })).data;
  }
  async deleteReply(id: number): Promise<void> {
    await apiClient.delete(`/notifications/messages/${id}`);
  }
}
