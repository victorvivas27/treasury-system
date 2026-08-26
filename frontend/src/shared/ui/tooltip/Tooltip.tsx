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
const CLICK_VISIBLE_TIME = 2000;

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
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    let hovered = false;
    const clearHideTimeout = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = undefined;
    };
    const show = () => {
      clearHideTimeout();
      setVisible(true);
    };
    const hide = () => {
      clearHideTimeout();
      setVisible(false);
    };
    const showOnHover = () => {
      hovered = true;
      show();
    };
    const hideOnLeave = () => {
      hovered = false;
      hide();
    };
    const showTemporarily = () => {
      show();
      hideTimeout = setTimeout(() => {
        if (!hovered || !window.matchMedia("(hover: hover)").matches) setVisible(false);
      }, CLICK_VISIBLE_TIME);
    };
    anchor.addEventListener("mouseenter", showOnHover);
    anchor.addEventListener("mouseleave", hideOnLeave);
    anchor.addEventListener("click", showTemporarily);
    return () => {
      clearHideTimeout();
      anchor.removeEventListener("mouseenter", showOnHover);
      anchor.removeEventListener("mouseleave", hideOnLeave);
      anchor.removeEventListener("click", showTemporarily);
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
