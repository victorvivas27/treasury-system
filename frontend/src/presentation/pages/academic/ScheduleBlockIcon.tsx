import { FiBookOpen, FiCoffee, FiMusic } from "react-icons/fi";
import type { ScheduleBlock } from "@/core/A-domain/entities/academic/Schedule";

export function ScheduleBlockIcon({ block }: { block: ScheduleBlock }) {
  const Icon = block.type === "BREAK" || block.type === "LUNCH" || block.type === "SNACK"
    ? FiCoffee : /m[uú]sica/i.test(block.name ?? "") ? FiMusic : FiBookOpen;
  return <Icon aria-hidden="true" />;
}
