export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const TYPES = { SUBJECT: "Materia", BREAK: "Recreo", SNACK: "Colación", LUNCH: "Almuerzo", ACTIVITY: "Actividad" };
export interface ScheduleBlock {
  dayOfWeek: number; startTime: string; endTime: string;
  type: keyof typeof TYPES; name: string | null; order: number; color: string | null;
}
export interface ScheduleDay { dayOfWeek: number; entryTime: string; exitTime: string; blocks: ScheduleBlock[] }
export interface Schedule { days: ScheduleDay[] }
export interface SchoolPeriod { schoolYear: number; course: string; editable: boolean }
export const timeLabel = (value: string) => value.slice(0, 5);
export const orderedBlocks = (day: ScheduleDay) => [...day.blocks].sort((a, b) =>
  timeLabel(a.startTime).localeCompare(timeLabel(b.startTime)) || a.order - b.order);
export function validateSchedule(schedule: Schedule): string | null {
  const seen = new Set<number>();
  for (const day of schedule.days) {
    if (day.dayOfWeek < 1 || day.dayOfWeek > 5 || seen.has(day.dayOfWeek)) return "Jornada inválida o duplicada.";
    seen.add(day.dayOfWeek);
    const dayName = DAYS[day.dayOfWeek - 1];
    const entry = timeLabel(day.entryTime), exit = timeLabel(day.exitTime);
    const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value);
    if (!validTime(day.entryTime) || !validTime(day.exitTime)) return `${dayName}: falta configurar una hora válida de entrada o salida.`;
    if (entry >= exit) return `${dayName}: la entrada debe ser anterior a la salida.`;
    let previousEnd = "";
    let previousName = "";
    for (const block of orderedBlocks(day)) {
      const blockName = block.name?.trim() || TYPES[block.type];
      const context = `${dayName} · ${blockName} (bloque ${day.blocks.indexOf(block) + 1})`;
      const start = timeLabel(block.startTime), end = timeLabel(block.endTime);
      if (!validTime(block.startTime) || !validTime(block.endTime)) return `${context}: falta configurar una hora válida de inicio o fin.`;
      if (start >= end) return `${context}: el inicio debe ser anterior al fin.`;
      if (start < entry || end > exit) return `${context}: el bloque queda fuera de la jornada (${entry} – ${exit}).`;
      if (start < previousEnd) return `${context}: hay bloques superpuestos con ${previousName}.`;
      if ((block.type === "SUBJECT" || block.type === "ACTIVITY") && !block.name?.trim()) return `${context}: indique el nombre de la materia o actividad.`;
      previousEnd = end;
      previousName = blockName;
    }
  }
  return null;
}
