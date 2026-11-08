import { GetApoderadosUseCase } from "@/core/B-application/use-cases/apoderado/list/GetApoderadosUseCase";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasPageData, useCachedPageState, readPageData, storePageData, pageDataSession } from '../useCachedPageState';

const repository = new ApoderadoRepositoryImpl();
const getApoderadosUseCase = new GetApoderadosUseCase(repository);

interface UseApoderadosOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useApoderados = (options: UseApoderadosOptions = {}) => {
  const { initialPage = 0, pageSize = 3 } = options;
  const scope = `apoderados:${pageSize}:${initialPage}`;
  const [apoderados, setApoderados] = useCachedPageState<Apoderado[]>(`${scope}:items`, []);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(() => hasPageData(`${scope}:items`, `${scope}:totalPages`, `${scope}:totalElements`));
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useCachedPageState(`${scope}:page`, initialPage);
  const [totalPages, setTotalPages] = useCachedPageState(`${scope}:totalPages`, 0);
  const [totalElements, setTotalElements] = useCachedPageState(`${scope}:totalElements`, 0);
  const [search, setSearch] = useState(() => readPageData<string>(`${scope}:search`) ?? '');
  const entryPage = useRef(currentPage);
  const requestSequence = useRef(0);

  const fetchApoderados = useCallback(async (page: number) => {
    const request = ++requestSequence.current;
    const requestSession = pageDataSession();
    try {
      setLoading(true);
      setError(null);

      const data = await getApoderadosUseCase.execute(page, pageSize, search);
  if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      storePageData(`${scope}:search`, search, requestSession);

      setApoderados(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      setError(
        err instanceof Error ? err.message : "Error al cargar apoderados",
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

  const replaceApoderado = useCallback((updatedApoderado: Apoderado) => {
    setApoderados((current) => current.map((apoderado) =>
      apoderado.apoderadoId === updatedApoderado.apoderadoId
        ? updatedApoderado
        : apoderado,
    ));
  }, []);

  useEffect(() => {
    fetchApoderados(entryPage.current);
    entryPage.current = initialPage;
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
    replaceApoderado,
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
