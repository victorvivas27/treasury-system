import { GetApoderadosUseCase } from "@/core/application/use-cases/apoderado/GetApoderadosUseCase";
import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useEffect, useState } from "react";

const repository = new ApoderadoRepositoryImpl();
const getApoderadosUseCase = new GetApoderadosUseCase(repository);

export const useApoderados = () => {
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApoderados = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApoderadosUseCase.execute();
      setApoderados(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar apoderados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApoderados();
  }, []);

  return {
    apoderados,
    loading,
    error,
    refetch: fetchApoderados,
  };
};
