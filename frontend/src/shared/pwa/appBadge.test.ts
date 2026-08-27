import { subscriptionPayload, syncAppBadge, urlBase64ToUint8Array } from "./appBadge";

describe("appBadge", () => {
  it("convierte la clave VAPID base64url al formato requerido por PushManager", () => {
    expect(Array.from(urlBase64ToUint8Array("AQIDBA"))).toEqual([1, 2, 3, 4]);
  });

  it("sincroniza y limpia el contador cuando el navegador admite Badging API", async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperties(navigator, {
      setAppBadge: { configurable: true, value: setAppBadge },
      clearAppBadge: { configurable: true, value: clearAppBadge },
    });

    await syncAppBadge(3);
    await syncAppBadge(0);

    expect(setAppBadge).toHaveBeenCalledWith(3);
    expect(clearAppBadge).toHaveBeenCalledOnce();
  });

  it("normaliza la suscripción que se envía al backend", () => {
    const subscription = {
      toJSON: () => ({ endpoint: "https://push.example/sub", keys: {
        p256dh: "public-key", auth: "auth-key",
      } }),
    } as PushSubscription;

    expect(subscriptionPayload(subscription)).toEqual({
      endpoint: "https://push.example/sub", p256dh: "public-key", auth: "auth-key",
    });
  });
});
