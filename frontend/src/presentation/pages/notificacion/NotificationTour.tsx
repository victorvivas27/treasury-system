import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { FiBell, FiCheckCircle, FiChevronLeft, FiChevronRight,
  FiMessageCircle } from "react-icons/fi";
import type { User } from "@/core/A-domain/entities/user/User";
import "@/shared/ui/apptour/AppTour.css";

export const OPEN_NOTIFICATION_TOUR_EVENT = "open-notification-tour";
const TOUR_VERSION = "v1";

const steps = [
  { title: "Tus notificaciones", description: "Aquí recibirás los avisos enviados por Tesorería y podrás conversar directamente con la administración.", icon: FiBell },
  { title: "Acciones rápidas", description: "Actualiza los mensajes o marca todas las notificaciones pendientes como leídas.", selector: "[data-notification-tour='actions']", icon: FiCheckCircle },
  { title: "Mensajes y estados", description: "Los mensajes nuevos se distinguen como no leídos. Puedes marcarlos como leídos o eliminarlos.", selector: "[data-notification-tour='messages']", icon: FiBell },
  { title: "Responde desde aquí", description: "Al final de la conversación puedes escribir una respuesta para Tesorería.", selector: "[data-notification-tour='messages']", icon: FiMessageCircle },
  { title: "Todo listo", description: "Puedes repetir esta explicación cuando quieras con el botón “Cómo usar”.", selector: "[data-notification-tour='help']", icon: FiCheckCircle },
];

export const NotificationTour = ({ user }: { user: User }) => {
  const storageKey = `treasury-notifications-tour-${TOUR_VERSION}-${user.id}`;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];
  const start = useCallback(() => { setStepIndex(0); setOpen(true); }, []);

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(start, 500);
    return () => window.clearTimeout(timer);
  }, [start, storageKey]);

  useEffect(() => {
    window.addEventListener(OPEN_NOTIFICATION_TOUR_EVENT, start);
    return () => window.removeEventListener(OPEN_NOTIFICATION_TOUR_EVENT, start);
  }, [start]);

  useEffect(() => {
    if (!open) return;
    const updateTarget = () => setTargetRect(step.selector
      ? document.querySelector(step.selector)?.getBoundingClientRect() ?? null : null);
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [open, step]);

  if (!open) return null;
  const finish = () => { localStorage.setItem(storageKey, new Date().toISOString()); setOpen(false); };
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const estimatedHeight = window.innerWidth <= 600 ? 290 : 240;
  const cardStyle: CSSProperties = targetRect ? {
    width: cardWidth,
    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16)),
    top: targetRect.bottom + 16 + estimatedHeight < window.innerHeight
      ? targetRect.bottom + 16 : Math.max(16, targetRect.top - estimatedHeight - 16),
  } : { width: cardWidth };
  const spotlightStyle: CSSProperties | undefined = targetRect ? {
    left: targetRect.left - 6, top: targetRect.top - 6,
    width: targetRect.width + 12, height: targetRect.height + 12,
  } : undefined;
  const StepIcon = step.icon;

  return <div className={`app-tour${targetRect ? " has-target" : " is-centered"}`}
    role="dialog" aria-modal="true" aria-labelledby="notification-tour-title">
    {targetRect && <div className="app-tour__spotlight" style={spotlightStyle} />}
    <section className="app-tour__card" style={cardStyle}>
      <header><span className="app-tour__icon"><StepIcon aria-hidden="true" /></span>
        <button type="button" onClick={finish}>Omitir</button></header>
      <p className="app-tour__eyebrow">Guía de notificaciones · {stepIndex + 1} de {steps.length}</p>
      <h2 id="notification-tour-title">{step.title}</h2>
      <p className="app-tour__description">{step.description}</p>
      <div className="app-tour__progress" aria-hidden="true">{steps.map((item, index) =>
        <span className={index <= stepIndex ? "is-active" : ""} key={item.title} />)}</div>
      <footer><button type="button" className="app-tour__back" disabled={stepIndex === 0}
        onClick={() => setStepIndex(current => current - 1)}><FiChevronLeft /> Anterior</button>
        <button type="button" className="app-tour__next" onClick={() =>
          stepIndex === steps.length - 1 ? finish() : setStepIndex(current => current + 1)}>
          {stepIndex === steps.length - 1 ? "Finalizar" : "Siguiente"}
          {stepIndex < steps.length - 1 && <FiChevronRight />}</button></footer>
    </section>
  </div>;
};
