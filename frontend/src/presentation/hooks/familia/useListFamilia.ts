
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListAlumnoApoderadoUseCase } from "@/core/B-application/use-cases/familia/list/ListAlumnoApoderadoUseCase";

interface UseListFamiliaOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useListFamilia = (options: UseListFamiliaOptions = {}) => {
  const { initialPage = 0, pageSize = 5 } = options;
  const [familia, setFamilia] = useState<FamiliaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const getFamiliaByAlumnoUseCase = useMemo(
    () => new ListAlumnoApoderadoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const fetchFamilia = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const data = await getFamiliaByAlumnoUseCase.execute(page, pageSize, search);

      setFamilia(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar familias",
      );
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [getFamiliaByAlumnoUseCase, pageSize, search]);

  const nextPage = useCallback(async () => {
    if (currentPage + 1 < totalPages) {
      await fetchFamilia(currentPage + 1);
    }
  }, [currentPage, totalPages, fetchFamilia]);

  const prevPage = useCallback(async () => {
    if (currentPage > 0) {
      await fetchFamilia(currentPage - 1);
    }
  }, [currentPage, fetchFamilia]);

  const refetch = useCallback(() => {
    return fetchFamilia(currentPage);
  }, [currentPage, fetchFamilia]);

  useEffect(() => {
    fetchFamilia(initialPage);
  }, [fetchFamilia, initialPage]);

  const hasNextPage = currentPage + 1 < totalPages;
  const hasPrevPage = currentPage > 0;
  const isLastPage = currentPage + 1 === totalPages;

  return {
    familia,
    vinculos: familia,
    loading: loading && !hasLoaded,
    refreshing: loading && hasLoaded,
    error,
    refetch,
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage,
    hasNextPage,
    isLastPage,
    pageSize,
    totalPages,
    totalElements,
    search,
    setSearch,
  };
};

export const useListAlumnoApoderado = useListFamilia;
