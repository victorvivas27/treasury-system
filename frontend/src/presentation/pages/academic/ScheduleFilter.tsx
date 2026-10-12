import type { ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import "./ScheduleFilter.css";

export function ScheduleFilter({ label, loading, children, compact = false }: {
  label: string; loading: boolean; children: ReactNode; compact?: boolean;
}) {
  return <label className={`schedule-filter${compact ? " schedule-filter--compact" : ""}`}>
    <span>{label}</span>
    <span className={`schedule-filter-control${loading ? " is-loading" : ""}`} aria-busy={loading}>
      {children}
      {loading && <span className="schedule-filter-placeholder" aria-hidden="true"><Skeleton /></span>}
      <FiChevronDown className="schedule-filter-chevron" aria-hidden="true" />
    </span>
  </label>;
}
