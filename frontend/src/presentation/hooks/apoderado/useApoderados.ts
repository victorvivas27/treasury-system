import { GetApoderadosUseCase } from "@/core/B-application/use-cases/apoderado/list/GetApoderadosUseCase";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useEffect, useState } from "react";

const repository = new ApoderadoRepositoryImpl();
const getApoderadosUseCase = new GetApoderadosUseCase(repository);

export const useApoderados = (pageSize = 3) => {
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchApoderados = async (page: number) => {
    const MIN_LOADING_TIME = 300;
    const startTime = Date.now();

    try {
      setLoading(true);
      setError(null);

      const data = await getApoderadosUseCase.execute(page, pageSize);

      setApoderados(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setIsLastPage(data.page + 1 >= data.totalPages);
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
  };

  const nextPage = () => {
    if (!isLastPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));

  useEffect(() => {
    fetchApoderados(currentPage);
  }, [currentPage]);

  return {
    apoderados,
    loading,
    error,
    refetch: () => fetchApoderados(currentPage),
    currentPage,
    nextPage,
    prevPage,
    hasPrevPage: currentPage > 0,
    isLastPage,
    pageSize,
    totalPages,
    totalElements,
  };
};
