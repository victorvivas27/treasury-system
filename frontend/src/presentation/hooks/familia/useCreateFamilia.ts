import type { CreateFamiliaDTO } from "@/core/A-domain/entities/familia/Familia";
import { CreateAlumnoUseCase } from "@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase";

import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import axios from "axios";
import { useMemo, useState } from "react";



export const useCreateFamilia = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const useCase = useMemo(
    () => new CreateAlumnoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const create = async (payload: CreateFamiliaDTO) => {
    try {
      setLoading(true);
      setError(null);
      setFieldErrors({});
      return await useCase.execute(payload);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "No se pudo crear el vínculo"
          : "No se pudo crear el vínculo",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error, fieldErrors };
};
