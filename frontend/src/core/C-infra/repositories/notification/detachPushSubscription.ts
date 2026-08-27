import { apiClient } from "@/core/D-config/api";
import { syncAppBadge } from "@/shared/pwa/appBadge";

export const detachPushSubscription = async (token: string) => {
  await syncAppBadge(0);
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await apiClient.delete("/notifications/push/subscription", {
    data: { endpoint: subscription.endpoint },
    headers: { Authorization: `Bearer ${token}` },
  });
};
