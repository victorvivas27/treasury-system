import type { CSSProperties } from "react";
import LoadingSkeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "./Skeleton.css";

type SkeletonProps = {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
};

export const Skeleton = ({ className = "", width, height }: SkeletonProps) => (
  <span className={`data-skeleton ${className}`.trim()} style={{ width, height }} aria-hidden="true">
    <LoadingSkeleton height={height} baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)" />
  </span>
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
