import { useEffect, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import "./ExpandableSearch.css";

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const ExpandableSearch = ({
  value,
  onChange,
  label = "Buscar por nombre",
}: ExpandableSearchProps) => {
  const [open, setOpen] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className={`expandable-search${open ? " is-open" : ""}`}>
      {open && (
        <input
          ref={inputRef}
          type="search"
          value={value}
          aria-label={label}
          placeholder={label}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onChange("");
              setOpen(false);
            }
          }}
        />
      )}
      <button
        type="button"
        aria-label={open ? "Cerrar búsqueda" : label}
        aria-expanded={open}
        onClick={() => {
          if (open) onChange("");
          setOpen((current) => !current);
        }}
      >
        {open ? <FiX aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
      </button>
    </div>
  );
};
