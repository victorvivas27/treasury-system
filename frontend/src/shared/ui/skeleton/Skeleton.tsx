import type { CSSProperties } from "react";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";

type SkeletonProps = {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
};

export const Skeleton = ({ className = "", width, height }: SkeletonProps) => (
  <span className={`skeleton-block ${className}`.trim()} aria-hidden="true"
    style={{ width, height }} />
);

export const CardValueSkeleton = ({ className = "" }: Pick<SkeletonProps, "className">) => (
  <Skeleton className={`card-value-skeleton ${className}`.trim()} />
);

export const ChartSkeleton = ({ className = "" }: Pick<SkeletonProps, "className">) => (
  <Skeleton className={`chart-content-skeleton ${className}`.trim()} />
);

export const TableSkeleton = ({ rows = 5, columns }: { rows?: number; columns: number }) => (
  <tbody aria-label="Cargando registros">
    {Array.from({ length: rows }, (_, row) => <tr key={row} aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => <td key={column}>
        <Skeleton height=".9rem" />
      </td>)}
    </tr>)}
  </tbody>
);
