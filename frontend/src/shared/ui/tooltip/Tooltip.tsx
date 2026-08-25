import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

type TooltipPosition = "top" | "right" | "bottom" | "left" | "bottom-right";

type TooltipProps = {
  content: string;
  position?: TooltipPosition;
  className?: string;
};

type Coordinates = { left: number; top: number };
const GAP = 8;

export const Tooltip = ({ content, position = "top", className = "" }: TooltipProps) => {
  const markerRef = useRef<HTMLSpanElement>(null);
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
    if (!anchor) return;
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    anchor.addEventListener("mouseenter", show);
    anchor.addEventListener("mouseleave", hide);
    anchor.addEventListener("focusin", show);
    anchor.addEventListener("focusout", hide);
    return () => {
      anchor.removeEventListener("mouseenter", show);
      anchor.removeEventListener("mouseleave", hide);
      anchor.removeEventListener("focusin", show);
      anchor.removeEventListener("focusout", hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition, visible]);

  return <>
    <span ref={markerRef} className="ui-tooltip__marker" aria-hidden="true" />
    {visible && createPortal(
      <span ref={tooltipRef} className={`ui-tooltip ui-tooltip--${position} ${className}`.trim()}
        style={coordinates} role="tooltip">{content}</span>,
      document.body,
    )}
  </>;
};
