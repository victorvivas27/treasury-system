type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export const syncAppBadge = async (count: number) => {
  if (typeof navigator === "undefined") return;
  const badgeNavigator = navigator as BadgeNavigator;
  try {
    if (count > 0 && badgeNavigator.setAppBadge) await badgeNavigator.setAppBadge(count);
    else if (count <= 0 && badgeNavigator.clearAppBadge) await badgeNavigator.clearAppBadge();
  } catch {
    // El launcher puede rechazar badges aunque el navegador exponga la API.
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: "SYNC_BADGE", count });
  } catch {
    // El badge visual interno sigue funcionando si no existe un service worker activo.
  }
};

export const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
};

export const subscriptionPayload = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("El navegador entregó una suscripción push incompleta.");
  }
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
};
