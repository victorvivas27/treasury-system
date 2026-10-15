import { orderedBlocks, timeLabel, type ScheduleBlock, type ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";

// Presentation defaults only: never write inferred colors or ingress into the schedule.
export function scheduleCardColor(block: ScheduleBlock): string {
  if (block.color) return block.color;
  if (block.type === "BREAK") return "#169b79";
  if (block.type === "LUNCH") return "#d58a16";
  if (block.type === "SNACK") return "#c76c36";
  const name = (block.name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (name.includes("matemat")) return "#5276df";
  if (name.includes("ingles")) return "#9b59cf";
  if (name.includes("lenguaje")) return "#d35b79";
  if (name.includes("educacion fisica")) return "#168cab";
  if (name.includes("musica")) return "#ba7726";
  return "#64748b";
}

export function scheduleIngress(day: ScheduleDay): { start: string; end: string } | null {
  const start = timeLabel(day.entryTime);
  const first = orderedBlocks(day)[0];
  const end = first ? timeLabel(first.startTime) : "";
  return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end ? { start, end } : null;
}
