import { GetApoderadosUseCase } from "@/core/B-application/use-cases/apoderado/list/GetApoderadosUseCase";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useCallback, useEffect, useState } from "react";

const repository = new ApoderadoRepositoryImpl();
const getApoderadosUseCase = new GetApoderadosUseCase(repository);

interface UseApoderadosOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useApoderados = (options: UseApoderadosOptions = {}) => {
  const { initialPage = 0, pageSize = 3 } = options;
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchApoderados = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const data = await getApoderadosUseCase.execute(page, pageSize);

      setApoderados(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar apoderados",
      );
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [pageSize]);

  const nextPage = useCallback(async () => {
    if (currentPage + 1 < totalPages) {
      await fetchApoderados(currentPage + 1);
    }
  }, [currentPage, totalPages, fetchApoderados]);

  const prevPage = useCallback(async () => {
    if (currentPage > 0) {
      await fetchApoderados(currentPage - 1);
    }
  }, [currentPage, fetchApoderados]);

  const refetch = useCallback(() => {
    return fetchApoderados(currentPage);
  }, [currentPage, fetchApoderados]);

  useEffect(() => {
    fetchApoderados(initialPage);
  }, [fetchApoderados, initialPage]);

  const hasNextPage = currentPage + 1 < totalPages;
  const hasPrevPage = currentPage > 0;
  const isLastPage = currentPage + 1 === totalPages;

  return {
    apoderados,
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
  };
};
