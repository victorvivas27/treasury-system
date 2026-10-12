interface ScheduleTimeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export function ScheduleTimeSelect({ label, value, onChange }: ScheduleTimeSelectProps) {
  const [hour = "", minute = ""] = value.split(":");
  return <span className="schedule-time-select" role="group" aria-label={label}>
    <select aria-label={`${label} · Hora`} value={hour}
      onChange={event => onChange(`${event.target.value}:${minute || "00"}`)}>
      <option value="" disabled>HH</option>
      {hours.map(item => <option key={item} value={item}>{item}</option>)}
    </select>
    <span aria-hidden="true">:</span>
    <select aria-label={`${label} · Minutos`} value={minute}
      onChange={event => onChange(`${hour || "00"}:${event.target.value}`)}>
      <option value="" disabled>mm</option>
      {minutes.map(item => <option key={item} value={item}>{item}</option>)}
    </select>
  </span>;
}
