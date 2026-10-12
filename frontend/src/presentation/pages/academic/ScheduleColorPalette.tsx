const COLORS = [
  ["Azul", "#2563eb"], ["Verde", "#16a34a"], ["Coral", "#f97360"],
  ["Violeta", "#9333ea"], ["Dorado", "#d4a017"], ["Turquesa", "#0891b2"],
  ["Rosa", "#db2777"], ["Naranja", "#ea580c"], ["Marrón", "#925c38"],
  ["Gris", "#64748b"],
] as const;

export function ScheduleColorPalette({ label, value, onChange }: {
  label: string; value: string | null | undefined; onChange: (color: string) => void;
}) {
  const selected = COLORS.some(([, color]) => color === value?.toLowerCase()) ? value!.toLowerCase() : "";
  return <label className="schedule-color-palette">Color
    <span className="schedule-color-select">
      <span className="schedule-color-preview" aria-hidden="true" style={{ backgroundColor: value ?? "transparent" }} />
      <select aria-label={label} value={selected} onChange={event => onChange(event.target.value)}>
        <option value="" disabled>{value ? "Color actual" : "Elegir color"}</option>
        {COLORS.map(([name, color]) => <option key={color} value={color}>{name}</option>)}
      </select>
    </span>
  </label>;
}
