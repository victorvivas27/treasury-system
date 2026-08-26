import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCode, FiCopy, FiX } from "react-icons/fi";
import "./CodeReveal.css";

interface CodeRevealProps {
  codes: Array<{ label?: string; value: string | number }>;
  label?: string;
}

type Position = { top: number; left: number };

export const CodeReveal = ({ codes, label = "Ver código" }: CodeRevealProps) => {
  const popoverId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      setPosition({
        top: rect.bottom + 6,
        left: Math.min(window.innerWidth - popoverWidth - 8, Math.max(8, rect.left)),
      });
    }
    setCopied(false);
    setOpen((current) => !current);
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(codes.map(({ value }) => value).join("\n"));
    setCopied(true);
  };

  return <>
    <button ref={buttonRef} type="button" className="code-reveal__button"
      aria-label={label} aria-expanded={open} aria-controls={popoverId} onClick={toggle}>
      <FiCode aria-hidden="true" />
    </button>
    {open && createPortal(
      <div ref={popoverRef} id={popoverId} className="code-reveal__popover"
        style={position} role="dialog" aria-label="Código de registro">
        <header><strong>Código</strong><button type="button" onClick={() => setOpen(false)}
          aria-label="Cerrar"><FiX aria-hidden="true" /></button></header>
        <div className="code-reveal__values">
          {codes.map(({ label: codeLabel, value }) => <span key={`${codeLabel ?? "code"}-${value}`}>
            {codeLabel && <small>{codeLabel}</small>}<strong>{value}</strong>
          </span>)}
        </div>
        <button type="button" className="code-reveal__copy" onClick={() => void copyCodes()}>
          <FiCopy aria-hidden="true" />{copied ? "Copiado" : "Copiar"}
        </button>
      </div>, document.body)}
  </>;
};
