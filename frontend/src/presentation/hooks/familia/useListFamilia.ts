
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasPageData, useCachedPageState, readPageData, storePageData, pageDataSession } from '../useCachedPageState';
import { ListAlumnoApoderadoUseCase } from "@/core/B-application/use-cases/familia/list/ListAlumnoApoderadoUseCase";

interface UseListFamiliaOptions {
  initialPage?: number;
  pageSize?: number;
}

export const useListFamilia = (options: UseListFamiliaOptions = {}) => {
  const { initialPage = 0, pageSize = 5 } = options;
  const scope = `familias:${pageSize}:${initialPage}`;
  const [familia, setFamilia] = useCachedPageState<FamiliaDetalle[]>(`${scope}:items`, []);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(() => hasPageData(`${scope}:items`, `${scope}:totalPages`, `${scope}:totalElements`));
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useCachedPageState(`${scope}:page`, initialPage);
  const [totalPages, setTotalPages] = useCachedPageState(`${scope}:totalPages`, 0);
  const [totalElements, setTotalElements] = useCachedPageState(`${scope}:totalElements`, 0);
  const [search, setSearch] = useState(() => readPageData<string>(`${scope}:search`) ?? '');
  const entryPage = useRef(currentPage);
  const requestSequence = useRef(0);
  const getFamiliaByAlumnoUseCase = useMemo(
    () => new ListAlumnoApoderadoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const fetchFamilia = useCallback(async (page: number) => {
    const request = ++requestSequence.current;
    const requestSession = pageDataSession();
    try {
      setLoading(true);
      setError(null);

      const data = await getFamiliaByAlumnoUseCase.execute(page, pageSize, search);
  if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      storePageData(`${scope}:search`, search, requestSession);

      setFamilia(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
    } catch (err) {
      if (request !== requestSequence.current || requestSession !== pageDataSession()) return;
      setError(
        err instanceof Error ? err.message : "Error al cargar familias",
      );
    } finally {
      if (request === requestSequence.current && requestSession === pageDataSession()) {
        setHasLoaded(true);
        setLoading(false);
      }
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

  const updateFamiliaStatus = useCallback((familiaId: number, activo: boolean) => {
    setFamilia((current) => current.map((item) =>
      item.familiaId === familiaId ? { ...item, activo } : item,
    ));
  }, []);

  useEffect(() => {
    fetchFamilia(entryPage.current);
    entryPage.current = initialPage;
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
    updateFamiliaStatus,
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
