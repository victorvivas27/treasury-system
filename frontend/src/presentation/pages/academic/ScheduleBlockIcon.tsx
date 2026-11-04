import { FiBookOpen, FiCoffee, FiMusic, FiSunrise } from "react-icons/fi";
import type { ScheduleBlock } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleBlockIcon({ block }: { block: ScheduleBlock }) {
  const name = (block.name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
  const Icon = block.type === "BREAK" || block.type === "LUNCH" || block.type === "SNACK"
    ? FiCoffee : /m[uú]sica/i.test(block.name ?? "") ? FiMusic : FiBookOpen;
  if (/\b(ingreso|entrada)\b/.test(name)) return <FiSunrise aria-hidden="true" />;
  return <Icon aria-hidden="true" />;
}
