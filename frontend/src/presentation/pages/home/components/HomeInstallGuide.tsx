import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useId } from "react";
import { FiArrowDown, FiArrowRight, FiCheck, FiDownload, FiMoreHorizontal, FiShare, FiX } from "react-icons/fi";
import { FaChrome, FaEdge, FaFirefoxBrowser, FaSafari } from "react-icons/fa";
import { useAppInstallation } from "@/shared/pwa/installApp";
import "../style/HomeInstallGuide.css";

type Browser = "chrome" | "edge" | "firefox" | "safari";
const browsers = {
  chrome: { name: "Chrome", Icon: FaChrome },
  edge: { name: "Edge", Icon: FaEdge },
  firefox: { name: "Firefox", Icon: FaFirefoxBrowser },
  safari: { name: "Safari", Icon: FaSafari },
};
const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const currentBrowser = (): Browser => {
  const agent = navigator.userAgent;
  if (isAppleMobile()) return "safari";
  if (/Edg/.test(agent)) return "edge";
  if (/Firefox/.test(agent)) return "firefox";
  if (/Safari/.test(agent) && !/Chrome|Chromium/.test(agent)) return "safari";
  return "chrome";
};
const installationSteps = (browser: Browser) => {
  if (isAppleMobile()) return ["Abre esta página en Safari", "Toca Compartir y Agregar a inicio"];
  if (browser === "safari") return ["Abre Archivo en la barra superior", "Selecciona Añadir al Dock"];
  if (browser === "firefox" && !/Android/.test(navigator.userAgent)) return ["Abre esta página en Firefox para Windows", "Pulsa el icono de aplicaciones web junto a la dirección"];
  if (/Android/.test(navigator.userAgent)) return ["Abre el menú ⋮ del navegador", "Elige Instalar aplicación o Agregar a inicio"];
  return browser === "edge"
    ? ["Abre el menú ⋯ de Edge", "En Aplicaciones, elige instalar este sitio"]
    : ["Abre el menú ⋮ de Chrome", "En Enviar, guardar y compartir, elige Instalar página como aplicación"];
};

export const HomeInstallGuide = () => {
  const dialogId = useId();
  const { state, install } = useAppInstallation();
  const [open, setOpen] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [browser, setBrowser] = useState<Browser>(currentBrowser);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const visible = open && state !== "installed";

  useEffect(() => {
    if (!visible) return;
    const previousFocus = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || interacted || installing || showSteps) return;
    const timer = window.setTimeout(() => setOpen(false), 12000);
    return () => window.clearTimeout(timer);
  }, [visible, interacted, installing, showSteps]);

  const handleInstall = async () => {
    setInteracted(true);
    setInstalling(true);
    const outcome = await install();
    setInstalling(false);
    if (outcome === "manual") setShowSteps(true);
    else setOpen(false);
  };

  const reopen = () => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowSteps(false);
    setBrowser(currentBrowser());
    setInteracted(true);
    setOpen(true);
  };

  if (state === "installed") return null;
  return <>
    <button className="install-launcher" type="button" onClick={reopen} hidden={visible}
      aria-label="Abrir opciones de instalación" aria-haspopup="dialog">
      <img src="/icono-tesoreria.png" alt="" width="24" height="24" />
      <span>Instalar app</span><FiDownload aria-hidden="true" />
    </button>
    {visible && createPortal(
    <dialog ref={dialogRef} className="install-modal" aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-description`} onCancel={() => setOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className={`install-modal__content${showSteps ? " install-modal__content--guide" : ""}`} onClick={(event) => event.stopPropagation()}
        onPointerDown={() => setInteracted(true)} onKeyDown={() => setInteracted(true)}>
        <button className="install-modal__close" type="button" aria-label="Cerrar invitación"
          onClick={() => setOpen(false)}><FiX aria-hidden="true" /></button>
        <div className="install-modal__brand" aria-hidden="true">
          <img src="/icono-tesoreria.png" alt="" width="64" height="64" />
          <span><FiArrowDown /></span>
        </div>
        <span className="install-modal__eyebrow">{showSteps ? "SOLO DOS PASOS" : "TU CURSO, SIEMPRE CONTIGO"}</span>
        <h2 id={`${dialogId}-title`}>{showSteps ? "¡Ya casi está!" : <>Menos vueltas.<br /><em>Más cerca de tu curso.</em></>}</h2>
        <p id={`${dialogId}-description`}>{showSteps ? "Sigue estos pasos en tu navegador." : "Pagos, actividades y novedades, a un toque desde tu pantalla de inicio."}</p>
        {!showSteps && <div className="install-modal__benefits"><span><FiCheck aria-hidden="true" /> Acceso directo</span><span><FiCheck aria-hidden="true" /> Sin tienda de apps</span></div>}
        <div className="install-modal__browsers" role="group" aria-label="Ver pasos por navegador">
          {(Object.entries(browsers) as [Browser, typeof browsers[Browser]][]).map(([key, { name, Icon }]) => (
            <button key={key} type="button" className={`install-modal__browser install-modal__browser--${key}`}
              aria-label={`Ver pasos para ${name}`} aria-pressed={showSteps && browser === key}
              onClick={() => { setBrowser(key); setShowSteps(true); setInteracted(true); }}>
              <Icon aria-hidden="true" /><span>{name}</span>
            </button>
          ))}
        </div>
        {showSteps ? <div className="install-modal__guide" role="status">
          <ol>{installationSteps(browser).map((step, index) => <li key={step}>
            <span className="install-modal__step-number">{index + 1}</span>
            <p>{step}</p>{index === 0 ? (isAppleMobile() ? <FiShare aria-hidden="true" /> : <FiMoreHorizontal aria-hidden="true" />) : <FiDownload aria-hidden="true" />}
          </li>)}</ol>
          <p className="install-modal__guide-note">{browser === "firefox" && !isAppleMobile() && !/Android/.test(navigator.userAgent)
            ? "¿No ves la opción? Actualiza Firefox en Ayuda → Acerca de Firefox. En Mac o Linux, usa Chrome o Edge."
            : "El nombre de la opción puede variar según tu dispositivo."}</p>
          <span className="install-modal__ready"><FiCheck aria-hidden="true" /> ¡Listo! Busca el icono de Tesorería.</span>
        </div> :
          <button className="install-modal__install" type="button" disabled={installing}
            onClick={() => void handleInstall()}><FiDownload aria-hidden="true" /> {installing ? "Abriendo…" : "Instalar app"}<FiArrowRight aria-hidden="true" /></button>}
        <button className="install-modal__later" type="button" onClick={() => setOpen(false)}>{showSteps ? "Entendido" : "Ahora no"}</button>
        {!interacted && <div className="install-modal__timeout"><span>Se cierra automáticamente en 12 segundos</span><i aria-hidden="true" /></div>}
      </div>
    </dialog>, document.body,
    )}
  </>;
};
