import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

type TooltipPosition = "top" | "right" | "bottom" | "left" | "bottom-right";

type TooltipProps = {
  content: string;
  disabled?: boolean;
  position?: TooltipPosition;
  className?: string;
};

type Coordinates = { left: number; top: number };
const GAP = 8;
export const Tooltip = ({ content, position = "top", className = "", disabled = false }: TooltipProps) => {
  const tooltipId = useId();
  const markerRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates>({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const anchor = markerRef.current?.parentElement;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
    let top = anchorRect.top - tooltipRect.height - GAP;

    if (position === "bottom") top = anchorRect.bottom + GAP;
    if (position === "left") {
      left = anchorRect.left - tooltipRect.width - GAP;
      top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
    }
    if (position === "right") {
      left = anchorRect.right + GAP;
      top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
    }
    if (position === "bottom-right") {
      left = anchorRect.right - tooltipRect.width;
      top = anchorRect.bottom + GAP;
    }

    left = Math.min(Math.max(GAP, left), window.innerWidth - tooltipRect.width - GAP);
    top = Math.min(Math.max(GAP, top), window.innerHeight - tooltipRect.height - GAP);
    setCoordinates({ left, top });
  }, [position]);

  useEffect(() => {
    const anchor = markerRef.current?.parentElement;
    if (!anchor || disabled) return;
    let hovered = false;
    let focused = false;
    const description = anchor.getAttribute("aria-describedby");
    anchor.setAttribute("aria-describedby", [description, tooltipId].filter(Boolean).join(" "));
    const show = () => { clearTimeout(hideTimer.current); setVisible(true); };
    const enter = () => { hovered = true; show(); };
    const leave = () => { hovered = false; if (!focused) hideTimer.current = setTimeout(() => setVisible(false), 150); };
    const focus = () => { focused = true; show(); };
    const blur = () => { focused = false; if (!hovered) setVisible(false); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.contains(event.target) && !tooltipRef.current?.contains(event.target)) setVisible(false);
    };
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setVisible(false); };
    anchor.addEventListener("mouseenter", enter);
    anchor.addEventListener("mouseleave", leave);
    anchor.addEventListener("focusin", focus);
    anchor.addEventListener("focusout", blur);
    anchor.addEventListener("click", show);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      anchor.removeEventListener("mouseenter", enter);
      anchor.removeEventListener("mouseleave", leave);
      anchor.removeEventListener("focusin", focus);
      anchor.removeEventListener("focusout", blur);
      anchor.removeEventListener("click", show);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
      clearTimeout(hideTimer.current);
      if (description) anchor.setAttribute("aria-describedby", description);
      else anchor.removeAttribute("aria-describedby");
    };
  }, [disabled, tooltipId]);

  useLayoutEffect(() => {
    if (!visible || disabled) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition, visible, disabled]);

  return <>
    <span ref={markerRef} className="ui-tooltip__marker" aria-hidden="true" />
    {!visible && !disabled && <span id={tooltipId} hidden>{content}</span>}
    {visible && !disabled && createPortal(
      <span id={tooltipId} ref={tooltipRef} className={`ui-tooltip ui-tooltip--${position} ${className}`.trim()}
        style={coordinates} role="tooltip"
        onMouseEnter={() => { clearTimeout(hideTimer.current); setVisible(true); }} onMouseLeave={() => {
          if (!markerRef.current?.parentElement?.contains(document.activeElement)) setVisible(false);
        }}>{content}</span>,
      document.body,
    )}
  </>;
};
