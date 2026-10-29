import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft, FiDownload, FiX } from "react-icons/fi";
import { FaAndroid, FaApple, FaChrome, FaEdge, FaFirefoxBrowser, FaSafari } from "react-icons/fa";
import { useAppInstallation } from "@/shared/pwa/installApp";
import "../style/HomeInstallGuide.css";

type Browser = "chrome" | "firefox" | "edge" | "safari";
type System = "android" | "ios";
const browsers = {
  chrome: { name: "Google Chrome", Icon: FaChrome },
  firefox: { name: "Mozilla Firefox", Icon: FaFirefoxBrowser },
  edge: { name: "Microsoft Edge", Icon: FaEdge },
  safari: { name: "Safari", Icon: FaSafari },
};
const systems = {
  android: { name: "Android", Icon: FaAndroid, browsers: ["chrome", "firefox", "edge"] as Browser[] },
  ios: { name: "iPhone (iOS)", Icon: FaApple, browsers: ["safari", "chrome", "firefox", "edge"] as Browser[] },
};
const steps: Record<System, Partial<Record<Browser, string[]>>> = {
  ios: {
    safari: ["Abre Safari y busca tesoreriaescolar.app.", "Toca las tres rayitas (☰) del lado izquierdo.", "Selecciona la flecha de compartir.", "Toca «Ver más».", "Selecciona «+ Agregar a inicio».", "Toca «Agregar»."],
    chrome: ["Abre Chrome y busca tesoreriaescolar.app.", "Toca la flecha de compartir.", "Selecciona «Ver más».", "Toca «+ Añadir a pantalla de inicio».", "Toca «Agregar»."],
    firefox: ["Abre Firefox y busca tesoreriaescolar.app.", "Toca la flecha de compartir.", "Selecciona «Ver más».", "Toca «+ Añadir a pantalla de inicio».", "Toca «Agregar»."],
    edge: ["Abre Edge y busca tesoreriaescolar.app.", "Toca el menú de las tres rayitas (☰).", "Selecciona la flecha de compartir.", "Toca «Ver más».", "Selecciona «+ Añadir a pantalla de inicio».", "Toca «Agregar»."],
  },
  android: {
    chrome: ["Abre Chrome y busca tesoreriaescolar.app.", "Toca el menú de los tres puntos (⋮).", "Desplázate hacia abajo hasta «Instala y crea acceso directo».", "Selecciona «Instalar».", "Confirma tocando nuevamente «Instalar»."],
    firefox: ["Abre Firefox y busca tesoreriaescolar.app.", "Toca el menú de los tres puntos (⋮).", "Selecciona «Más».", "Toca «Agregar app a la pantalla de inicio».", "Selecciona «Añadir»."],
    edge: ["Abre Edge y busca tesoreriaescolar.app.", "Toca el menú de las tres barras (☰).", "Desplázate hacia la derecha hasta «Agregar al teléfono».", "Selecciona «Instalar».", "Confirma tocando nuevamente «Instalar».", "Toca «Añadir»."],
  },
};

export const HomeInstallGuide = ({ placement = "floating" }: { placement?: "floating" | "menu" }) => {
  const dialogId = useId();
  const { state } = useAppInstallation();
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState<System | null>(null);
  const [browser, setBrowser] = useState<Browser | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const visible = open && state !== "installed";

  useEffect(() => {
    if (!visible) return;
    const previousFocus = triggerRef.current;
    const unlockScroll = lockBodyScroll();
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      unlockScroll();
      previousFocus?.focus();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      stageRef.current?.focus();
      dialogRef.current?.scrollTo?.(0, 0);
    }
  }, [visible, system, browser]);

  const reopen = () => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSystem(null);
    setBrowser(null);
    setOpen(true);
  };

  if (state === "installed") return null;
  return <>
    <button className={`install-launcher${placement === "menu" ? " install-launcher--menu" : ""}`} type="button" onClick={reopen} hidden={visible}
      aria-label="Abrir opciones de instalación" aria-haspopup="dialog">
      <img src="/icono-tesoreria.png" alt="" width="24" height="24" />
      <span>Instalar app</span><FiDownload aria-hidden="true" />
    </button>
    {visible && createPortal(
      <dialog ref={dialogRef} className="install-modal" aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`} onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="install-modal__content" onClick={(event) => event.stopPropagation()}>
          <button className="install-modal__close" type="button" aria-label="Cerrar guía de instalación"
            onClick={() => setOpen(false)}><FiX aria-hidden="true" /></button>
          <div className="install-modal__brand" aria-hidden="true">
            <img src="/icono-tesoreria.png" alt="" width="56" height="56" />
          </div>
          <h2 id={`${dialogId}-title`}>Instalar Tesorería Escolar</h2>
          <p id={`${dialogId}-description`}>Agrega Tesorería Escolar a la pantalla de inicio de tu celular para acceder de forma rápida y sencilla.</p>
          <h3 ref={stageRef} tabIndex={-1} className="install-modal__stage">
            {!system ? "Selecciona tu sistema operativo" : !browser ? `${systems[system].name}: selecciona tu navegador` : `${systems[system].name} · ${browsers[browser].name}`}
          </h3>
          {!system ? <div className="install-modal__options" role="group" aria-label="Sistemas operativos">
            {(Object.entries(systems) as [System, typeof systems[System]][]).map(([key, { name, Icon }]) =>
              <button key={key} type="button" className={`install-modal__browser install-modal__browser--${key}`} onClick={() => setSystem(key)}>
                <Icon aria-hidden="true" /><span>{name}</span>
              </button>)}
          </div> : !browser ? <div className="install-modal__options" role="group" aria-label="Navegadores">
            {systems[system].browsers.map(key => {
              const { name, Icon } = browsers[key];
              return <button key={key} type="button" className={`install-modal__browser install-modal__browser--${key}`} onClick={() => setBrowser(key)}>
                <Icon aria-hidden="true" /><span>{name}</span>
              </button>;
            })}
          </div> : <div className="install-modal__guide">
            <ol aria-label={`Instrucciones para ${browsers[browser].name} en ${systems[system].name}`}>
              {steps[system][browser]?.map((step, index) => <li key={step}>
                <span className="install-modal__step-number" aria-hidden="true">{index + 1}</span><p>{step}</p>
              </li>)}
            </ol>
            <p className="install-modal__guide-note">Los nombres de los menús pueden variar según la versión del navegador o del sistema operativo.</p>
          </div>}
        </div>
        <div className="install-modal__actions">
          {system && <button className="install-modal__later" type="button" onClick={() => browser ? setBrowser(null) : setSystem(null)}><FiArrowLeft aria-hidden="true" /> Volver</button>}
          <button className="install-modal__install" type="button" onClick={() => setOpen(false)}>Entendido</button>
        </div>
      </dialog>, document.body,
    )}
  </>;
};
