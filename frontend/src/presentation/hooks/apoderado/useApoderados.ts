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
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchApoderados = useCallback(async (page: number) => {
    const MIN_LOADING_TIME = 300;
    const startTime = Date.now();

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
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MIN_LOADING_TIME - elapsedTime;

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

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
