import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FcExpand } from "react-icons/fc";
import "./CompactSelect.css";

type CompactOption = { value: string; label: string };

export const CompactSelect = ({ value, options, placeholder, onChange, ariaLabel,
  allowEmpty = true, portal = false, menuClassName = "" }: {
  value: string; options: readonly CompactOption[]; placeholder: string;
  onChange: (value: string) => void;
  ariaLabel?: string; allowEmpty?: boolean; portal?: boolean; menuClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const choices = allowEmpty ? [{ value: "", label: placeholder }, ...options] : options;
  const selected = options.find(option => option.value === value);
  const expand = () => {
    setActive(Math.max(0, choices.findIndex(option => option.value === value)));
    setOpen(true);
  };
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useLayoutEffect(() => {
    if (!open || !portal) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 145 && above > below;
      const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 24);
      setPosition({ position: "fixed", left: Math.min(rect.left, window.innerWidth - width - 12), width,
        top: upward ? undefined : rect.bottom + 3,
        bottom: upward ? window.innerHeight - rect.top + 3 : undefined,
        right: "auto", maxHeight: Math.min(145, Math.max(40, upward ? above : below)),
        boxSizing: "border-box" });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, portal]);
  useEffect(() => {
    if (open) menuRef.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  const menu = open && <div ref={menuRef} id={menuId} className={`compact-select__menu ${menuClassName}`}
    style={portal ? position : undefined} role="listbox" aria-label={ariaLabel ?? placeholder}>
    {choices.map((option, index) => <button type="button" role="option" key={option.value}
      id={`${menuId}-${index}`} tabIndex={-1} aria-selected={option.value === value} title={option.label}
      className={active === index ? "is-keyboard-active" : undefined}
      onPointerMove={() => setActive(index)}
      onClick={() => choose(option.value)}>{option.label}</button>)}
  </div>;

  return <div className="compact-select" ref={root}>
    <button ref={trigger} type="button" role="combobox" className="compact-select__trigger"
      aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={open}
      aria-activedescendant={open ? `${menuId}-${active}` : undefined}
      onClick={() => { if (open) setOpen(false); else expand(); }}
      onKeyDown={event => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (!open) expand();
          else setActive(current => event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1
            : (current + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length);
        } else if (open && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          if (choices[active]) choose(choices[active].value);
        } else if (open && event.key === "Escape") {
          event.preventDefault(); event.stopPropagation(); setOpen(false);
        } else if (event.key === "Tab") setOpen(false);
      }}>
      <span>{selected?.label ?? placeholder}</span><FcExpand aria-hidden="true" />
    </button>
    {portal ? createPortal(menu, document.body) : menu}
  </div>;
};
