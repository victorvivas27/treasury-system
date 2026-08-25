import { useLayoutEffect, useRef, useState } from "react";
import "./SingleLineFitText.css";

interface SingleLineFitTextProps {
  children: string;
  className?: string;
  minFontSize?: number;
}

export const SingleLineFitText = ({ children, className = "", minFontSize = 7 }: SingleLineFitTextProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const maxFontSize = useRef<number | undefined>(undefined);
  const [fontSize, setFontSize] = useState<number>();

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const fit = () => {
      if (!maxFontSize.current) {
        maxFontSize.current = Number.parseFloat(window.getComputedStyle(text).fontSize) || 13;
      }
      const maximum = maxFontSize.current;
      text.style.fontSize = `${maximum}px`;
      const available = container.clientWidth;
      const required = text.scrollWidth;
      const next = available > 0 && required > available
        ? Math.max(minFontSize, maximum * available / required)
        : maximum;
      text.style.fontSize = `${next}px`;
      setFontSize(next);
    };

    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [children, minFontSize]);

  return <span ref={containerRef} className={`single-line-fit-text ${className}`.trim()}>
    <span ref={textRef} style={fontSize ? { fontSize } : undefined}>{children}</span>
  </span>;
};
