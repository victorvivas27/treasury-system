import { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import "./CompactSelect.css";

type CompactOption = { value: string; label: string };

export const CompactSelect = ({ value, options, placeholder, onChange }: {
  value: string; options: readonly CompactOption[]; placeholder: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <div className="compact-select" ref={root}>
    <button type="button" className="compact-select__trigger" aria-haspopup="listbox"
      aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{selected?.label ?? placeholder}</span><FiChevronDown aria-hidden="true" />
    </button>
    {open && <div className="compact-select__menu" role="listbox">
      <button type="button" role="option" aria-selected={!value}
        onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
      {options.map(option => <button type="button" role="option" key={option.value}
        aria-selected={option.value === value} onClick={() => {
          onChange(option.value); setOpen(false);
        }}>{option.label}</button>)}
    </div>}
  </div>;
};
