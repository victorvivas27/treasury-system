import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import "./LoadingState.css";
import { useEffect, useState } from "react";

export const LoadingState = ({ message = "Preparando tu espacio", variant = "fullscreen", delayMs = 0 }: {
  message?: string; variant?: "fullscreen" | "contained" | "page"; delayMs?: number;
}) => {
  const [visible, setVisible] = useState(delayMs === 0);
  useEffect(() => {
    if (!delayMs) { setVisible(true); return; }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  useEffect(() => {
    if (variant === "contained") return;
    const unlockScroll = lockBodyScroll();
    return () => { unlockScroll(); };
  }, [variant]);
  if (!visible) return null;
  return (
  <div className={`app-loader${variant !== "fullscreen" ? ` app-loader--${variant}` : ""}`} role="status" aria-live="polite" aria-label={message}>
    <div className="app-loader__content">
      <div className="app-loader__mark" aria-hidden="true">
        <span className="app-loader__ring" />
        <img className="app-loader__logo" src="/icono-tesoreria.png" alt="" width="68" height="68"
          decoding="sync" fetchPriority="high" onError={event => { event.currentTarget.hidden = true; }} />
      </div>
      <div>
        <p className="app-loader__title">Tesorería Escolar</p>
        <p className="app-loader__status">{message} <span className="app-loader__dots" aria-hidden="true">
          <i /><i /><i />
        </span></p>
      </div>
    </div>
  </div>
  );
};
