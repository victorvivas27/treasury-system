
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
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const getFamiliaByAlumnoUseCase = useMemo(
    () => new ListAlumnoApoderadoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const fetchFamilia = useCallback(async (page: number) => {
    const MIN_LOADING_TIME = 300;
    const startTime = Date.now();

    try {
      setLoading(true);
      setError(null);

      const data = await getFamiliaByAlumnoUseCase.execute(page, pageSize);

      setFamilia(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar familias",
      );
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MIN_LOADING_TIME - elapsedTime;

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      setLoading(false);
    }
  }, [getFamiliaByAlumnoUseCase, pageSize]);

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
    loading,
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
  };
};

export const useListAlumnoApoderado = useListFamilia;
