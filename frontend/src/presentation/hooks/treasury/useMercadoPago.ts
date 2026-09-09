import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mercadoPagoRepository } from "@/core/C-infra/repositories/treasury/MercadoPagoRepository";

export function useMercadoPago(reload: () => Promise<void>, admin: boolean) {
  const [params] = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canRetryReturn, setCanRetryReturn] = useState(false);
  const paymentId = params.get("payment_id") ?? params.get("collection_id");
  const returned = params.get("mp_return") === "1";

  useEffect(() => {
    let active = true;
    setCheckingAvailability(true);
    setAvailabilityError(false);
    void mercadoPagoRepository.available().then(value => { if (active) setEnabled(value === true); })
      .catch(() => { if (active) { setEnabled(false); setAvailabilityError(true); } })
      .finally(() => { if (active) setCheckingAvailability(false); });
    return () => { active = false; };
  }, [admin]);

  const refresh = useCallback(async (id: string) => {
    const result = await mercadoPagoRepository.reconcile(id);
    await reload();
    setCanRetryReturn(result.status !== "PAID" && result.providerStatus !== "rejected");
    setMessage(result.status === "PAID" ? "Pago confirmado. Tu cuota está pagada."
      : result.providerStatus === "rejected" ? "El pago fue rechazado. Puedes volver a intentar con Mercado Pago."
      : "El pago sigue pendiente de confirmación. Puedes actualizar su estado aquí.");
    return result;
  }, [reload]);

  useEffect(() => {
    if (admin || !returned) return;
    if (!paymentId || !/^\d{1,30}$/.test(paymentId)) {
      setMessage("Volviste de Mercado Pago. Si no completaste el pago, puedes retomarlo desde tu cuota.");
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const result = await mercadoPagoRepository.reconcile(paymentId);
        if (!active) return;
        await reload();
        if (!active) return;
        setCanRetryReturn(result.status !== "PAID" && result.providerStatus !== "rejected");
        setMessage(result.status === "PAID" ? "Pago confirmado. Tu cuota está pagada."
          : result.providerStatus === "rejected" ? "El pago fue rechazado. Puedes volver a intentar con Mercado Pago."
          : "El pago sigue pendiente de confirmación. Puedes actualizar su estado aquí.");
        if (result.status !== "PAID" && result.providerStatus !== "rejected" && ++attempts < 12)
          timer = setTimeout(() => { void check(); }, 5000);
      } catch {
        if (active) {
          setCanRetryReturn(true);
          setMessage("No pudimos verificar el pago. Actualiza su estado antes de volver a pagar.");
        }
      }
    };
    void check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [admin, paymentId, returned, reload]);

  const checkout = async (id: number) => {
    setBusy(true); setMessage("");
    try {
      const result = await mercadoPagoRepository.checkout(id);
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== "https:" || !['www.mercadopago.cl', 'www.mercadopago.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error("Invalid checkout URL");
      window.location.assign(url.href);
    } catch { setMessage("No pudimos abrir Mercado Pago. Actualiza tus cuotas e intenta nuevamente."); }
    finally { setBusy(false); }
  };

  const retry = async (id = paymentId) => {
    if (!id) return;
    setBusy(true);
    try { await refresh(id); }
    catch { setMessage("No pudimos verificar el pago. Intenta actualizar su estado nuevamente."); }
    finally { setBusy(false); }
  };
  return { enabled, checkingAvailability, availabilityError, busy, message, checkout, retry, returned, paymentId, canRetryReturn };
}
