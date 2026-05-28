import { GetAlumnosUseCase } from "@/core/B-application/use-cases/alumno/list/GetAlumnosUseCase";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { useCallback, useEffect, useState } from "react";

const repository = new AlumnoRepositoryImpl();
const getAlumnosUseCase = new GetAlumnosUseCase(repository);

interface UseAlumnosOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useAlumnos = (options: UseAlumnosOptions = {}) => {
  const { initialPage = 0, pageSize = 3 } = options;

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchAlumnos = useCallback(async (page: number) => {
    const MIN_LOADING_TIME = 300;
    const startTime = Date.now();

    try {
      setLoading(true);
      setError(null);

      const data = await getAlumnosUseCase.execute(page, pageSize);

      setAlumnos(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar alumnos",
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
      await fetchAlumnos(currentPage + 1);
    }
  }, [currentPage, totalPages, fetchAlumnos]);

  const prevPage = useCallback(async () => {
    if (currentPage > 0) {
      await fetchAlumnos(currentPage - 1);
    }
  }, [currentPage, fetchAlumnos]);

  const refetch = useCallback(() => {
    return fetchAlumnos(currentPage);
  }, [currentPage, fetchAlumnos]);

  useEffect(() => {
    fetchAlumnos(initialPage);
  }, [fetchAlumnos, initialPage]);

  const hasNextPage = currentPage + 1 < totalPages;
  const hasPrevPage = currentPage > 0;
  const isLastPage = currentPage + 1 === totalPages;

  return {
    alumnos,
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
