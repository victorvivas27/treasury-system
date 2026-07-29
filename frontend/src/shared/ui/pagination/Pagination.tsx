import { Button } from "@/shared/ui/button/Button";
import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
  ariaLabel?: string;
}

export const Pagination = ({ currentPage, totalPages, hasPrevious, hasNext,
  onPrevious, onNext, loading = false, ariaLabel = "Paginación" }: PaginationProps) =>
  <nav className="pagination" aria-label={ariaLabel}>
    <Button onClick={onPrevious} disabled={!hasPrevious || loading}
      variant="secondary" size="small" label="◀ Anterior" />
    <span className="no-highlight">Página {currentPage}
      {totalPages != null && ` de ${totalPages}`}</span>
    <Button onClick={onNext} disabled={!hasNext || loading}
      variant="secondary" size="small" label="Siguiente ▶" />
  </nav>;
