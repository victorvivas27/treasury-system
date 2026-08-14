import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiCompass, FiUsers } from "react-icons/fi";
import type { User } from "@/core/A-domain/entities/user/User";
import "./AppTour.css";

const TOUR_VERSION = "v2";
export const OPEN_APP_TOUR_EVENT = "open-app-tour";

interface TourStep {
  title: string;
  description: string;
  selector?: string;
  icon: typeof FiCompass;
}

const commonFinalStep: TourStep = {
  title: "Todo listo",
  description: "Puedes volver a ver este recorrido en Configuración cuando lo necesites.",
  selector: '[data-tour-path="/configuration"]',
  icon: FiCheckCircle,
};

const stepsFor = (user: User): TourStep[] => user.rol === "ADMIN" ? [
  { title: `¡Bienvenido, ${user.nombre}!`, description: "Te mostraremos las áreas principales para comenzar a administrar el sistema.", icon: FiCompass },
  { title: "Panel principal", description: "Aquí encuentras el resumen general y los indicadores más importantes.", selector: '[data-tour-path="/dashboard"]', icon: FiCompass },
  { title: "Familias", description: "Administra los vínculos entre cada alumno y sus apoderados, indicando su parentesco y apoderado principal.", selector: '[data-tour-path="/family"]', icon: FiUsers },
  { title: "Apoderados", description: "Crea y administra los datos de los apoderados y habilita su acceso a la aplicación.", selector: '[data-tour-path="/parents"]', icon: FiUsers },
  { title: "Alumnos", description: "Administra los alumnos, su nombre, curso y observaciones importantes.", selector: '[data-tour-path="/students"]', icon: FiUsers },
  { title: "Usuarios", description: "Administra las cuentas de usuario que pueden ingresar a la aplicación, sus roles y estado.", selector: '[data-tour-path="/users"]', icon: FiUsers },
  { title: "Perfil", description: "Consulta el estado de pagos asociado a la cuenta y permite actualizar el nombre del usuario.", selector: '[data-tour-path="/profile"]', icon: FiUsers },
  commonFinalStep,
] : [
  { title: `¡Bienvenido, ${user.nombre}!`, description: "Este breve recorrido te ayudará a encontrar la información de tu familia y sus pagos.", icon: FiCompass },
  { title: "Panel principal", description: "Aquí puedes revisar rápidamente la información general disponible para tu cuenta.", selector: '[data-tour-path="/dashboard"]', icon: FiCompass },
  { title: "Tu perfil familiar", description: "Consulta los datos del alumno, apoderado, cuotas y obligaciones asociadas.", selector: '[data-tour-path="/profile"]', icon: FiUsers },
  { title: "Notificaciones", description: "Revisa aquí los avisos y novedades importantes de la aplicación.", selector: '[data-tour-path="/notifications"]', icon: FiCompass },
  commonFinalStep,
];

export const AppTour = ({ user }: { user: User }) => {
  const steps = useMemo(() => stepsFor(user), [user]);
  const storageKey = `treasury-onboarding-${TOUR_VERSION}-${user.id}`;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];

  const start = useCallback(() => {
    setStepIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(start, 700);
    return () => window.clearTimeout(timer);
  }, [start]);

  useEffect(() => {
    const replay = () => start();
    window.addEventListener(OPEN_APP_TOUR_EVENT, replay);
    return () => window.removeEventListener(OPEN_APP_TOUR_EVENT, replay);
  }, [start]);

  useEffect(() => {
    if (!open) return;
    const updateTarget = () => {
      const element = step.selector ? document.querySelector(step.selector) : null;
      setTargetRect(element?.getBoundingClientRect() ?? null);
    };
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [open, step]);

  if (!open) return null;

  const finish = () => {
    localStorage.setItem(storageKey, new Date().toISOString());
    setOpen(false);
  };
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const isMobile = window.innerWidth <= 600;
  const estimatedCardHeight = isMobile ? 290 : 240;
  const cardGap = isMobile ? 12 : 16;
  const cardStyle: CSSProperties = targetRect ? {
    width: cardWidth,
    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16)),
    top: targetRect.bottom + cardGap + estimatedCardHeight < window.innerHeight
      ? targetRect.bottom + cardGap
      : Math.max(16, Math.min(targetRect.top - estimatedCardHeight - cardGap,
        window.innerHeight - estimatedCardHeight - 16)),
  } : { width: cardWidth };
  const spotlightStyle: CSSProperties | undefined = targetRect ? {
    left: targetRect.left - 6,
    top: targetRect.top - 6,
    width: targetRect.width + 12,
    height: targetRect.height + 12,
  } : undefined;
  const StepIcon = step.icon;

  return (
    <div className={`app-tour${targetRect ? " has-target" : " is-centered"}`} role="dialog" aria-modal="true" aria-labelledby="app-tour-title">
      {targetRect && <div className="app-tour__spotlight" style={spotlightStyle} />}
      <section className="app-tour__card" style={cardStyle}>
        <header>
          <span className="app-tour__icon"><StepIcon aria-hidden="true" /></span>
          <button type="button" onClick={finish}>Omitir</button>
        </header>
        <p className="app-tour__eyebrow">Recorrido guiado · {stepIndex + 1} de {steps.length}</p>
        <h2 id="app-tour-title">{step.title}</h2>
        <p className="app-tour__description">{step.description}</p>
        <div className="app-tour__progress" aria-hidden="true">
          {steps.map((item, index) => <span className={index <= stepIndex ? "is-active" : ""} key={item.title} />)}
        </div>
        <footer>
          <button type="button" className="app-tour__back" disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => current - 1)}>
            <FiChevronLeft aria-hidden="true" /> Anterior
          </button>
          <button type="button" className="app-tour__next"
            onClick={() => stepIndex === steps.length - 1 ? finish() : setStepIndex((current) => current + 1)}>
            {stepIndex === steps.length - 1 ? "Finalizar" : "Siguiente"}
            {stepIndex < steps.length - 1 && <FiChevronRight aria-hidden="true" />}
          </button>
        </footer>
      </section>
    </div>
  );
};
