import { readPageRequest } from '../pageRequestCache';
import { GetAlumnosUseCase } from "@/core/B-application/use-cases/alumno/list/GetAlumnosUseCase";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasPageData, useCachedPageState, readPageData, storePageData, pageDataSession } from '../useCachedPageState';

const repository = new AlumnoRepositoryImpl();
const getAlumnosUseCase = new GetAlumnosUseCase(repository);

interface UseAlumnosOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useAlumnos = (options: UseAlumnosOptions = {}) => {
  const { initialPage = 0, pageSize = 3 } = options;

  const scope = `alumnos:${pageSize}:${initialPage}`;
  const [alumnos, setAlumnos] = useCachedPageState<Alumno[]>(`${scope}:items`, []);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(() => hasPageData(`${scope}:items`, `${scope}:totalPages`, `${scope}:totalElements`));
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useCachedPageState(`${scope}:page`, initialPage);
  const [totalPages, setTotalPages] = useCachedPageState(`${scope}:totalPages`, 0);
  const [totalElements, setTotalElements] = useCachedPageState(`${scope}:totalElements`, 0);
  const [search, setSearch] = useState(() => readPageData<string>(`${scope}:search`) ?? '');
  const entryPage = useRef(currentPage);
  const requestSequence = useRef(0);

  const fetchAlumnos = useCallback(async (page: number, force = false) => {
    const request = ++requestSequence.current;
    const requestSession = pageDataSession();
    try {
      setLoading(true);
      setError(null);

      const data = await readPageRequest(JSON.stringify([scope, page, search]), () => getAlumnosUseCase.execute(page, pageSize, search), force);
  if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      storePageData(`${scope}:search`, search, requestSession);

      setAlumnos(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      setError(
        err instanceof Error ? err.message : "Error al cargar alumnos",
      );
    } finally {
      if (request === requestSequence.current && requestSession === pageDataSession()) {
        setHasLoaded(true);
        setLoading(false);
      }
    }
  }, [pageSize, search]);

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
    return fetchAlumnos(currentPage, true);
  }, [currentPage, fetchAlumnos]);

  const replaceAlumno = useCallback((updatedAlumno: Alumno) => {
    setAlumnos((current) => current.map((alumno) =>
      alumno.alumnoId === updatedAlumno.alumnoId
        ? updatedAlumno
        : alumno,
    ));
  }, []);

  useEffect(() => {
    fetchAlumnos(entryPage.current);
    entryPage.current = initialPage;
  }, [fetchAlumnos, initialPage]);

  const hasNextPage = currentPage + 1 < totalPages;
  const hasPrevPage = currentPage > 0;
  const isLastPage = currentPage + 1 === totalPages;

  return {
    alumnos,
    loading: loading && !hasLoaded,
    refreshing: loading && hasLoaded,
    error,
    refetch,
    replaceAlumno,
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
