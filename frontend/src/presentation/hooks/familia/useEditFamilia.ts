import type { CreateFamiliaDTO, FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { GetFamiliaUseCase } from "@/core/B-application/use-cases/familia/get/GetFamiliaUseCase";
import { EditAlumnoApoderadoUseCase } from "@/core/B-application/use-cases/familia/update/EditAlumnoApoderadoUseCase";
import { UpdateFamiliaUseCase } from "@/core/B-application/use-cases/familia/update/UpdateFamiliaUseCase";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

export const useEditFamilia = () => {
  const navigate = useNavigate();
  const { familiaId } = useParams();
  const numericId = useMemo(
    () => (familiaId ? Number(familiaId) : undefined),
    [familiaId],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string } | null>(null);
  const [familiaData, setFamiliaData] = useState<FamiliaDetalle | null>(null);
  const [formData, setFormData] = useState<CreateFamiliaDTO>({
    alumnoId: 0,
    observacionesGenerales: "",
    apoderados: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const { getUseCase, updateUseCase } = useMemo(() => {
    const repository = new FamiliaRepositoryImpl();
    return {
      getUseCase: new GetFamiliaUseCase(repository),
      updateUseCase: new UpdateFamiliaUseCase(repository),
    };
  }, []);

  const loadFamiliaData = useCallback(async () => {
    if (numericId === undefined || isNaN(numericId)) {
      setLoadError({ message: "ID de familia no valido" });
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setLoadError(null);

    try {
      const familia = await getUseCase.execute(numericId);
      const alumnoId = familia.alumno.alumnoId ?? familia.alumno.id;
      setFamiliaData(familia);
      setFormData({
        alumnoId: alumnoId ?? 0,
        observacionesGenerales: familia.observacionesGenerales ?? "",
        apoderados: familia.apoderados.map((apoderado) => {
          const apoderadoId = apoderado.apoderadoId ?? apoderado.id;
          return {
            apoderadoId: apoderadoId ?? 0,
            parentesco: apoderado.relacion.parentesco,
            esPrincipal: apoderado.relacion.esPrincipal,
          };
        }),
      });
    } catch {
      setLoadError({ message: "Error de conexion al cargar los datos" });
    } finally {
      setInitialLoading(false);
    }
  }, [numericId, getUseCase]);

  useEffect(() => {
    loadFamiliaData();
  }, [loadFamiliaData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === "observacionesGenerales") {
        return { ...prev, observacionesGenerales: value };
      }

      return prev;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleApoderadoChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      apoderados: (prev.apoderados ?? []).map((apoderado, currentIndex) => {
        if (name === "esPrincipal") {
          return {
            ...apoderado,
            esPrincipal: currentIndex === index,
          };
        }

        return currentIndex === index
          ? { ...apoderado, parentesco: value }
          : apoderado;
      }),
    }));

    const fieldName = `apoderados[${index}].${name}`;
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleSubmit = async () => {
    if (numericId === undefined || isNaN(numericId)) return;

    setLoading(true);
    setFieldErrors({});

    try {
      setError(null);
      await updateUseCase.execute(numericId, formData);
      setModal({ isOpen: true, message: "Familia actualizada con exito", type: "success" });
      setTimeout(() => navigate("/family"), 2000);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.errors) {
        setFieldErrors(error.response.data.errors);
      }
      setError("No se pudo actualizar la familia");
      setModal({ isOpen: true, message: "No se pudo actualizar la familia", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    familiaData,
    loading,
    initialLoading,
    fieldErrors,
    error,
    modal,
    handleChange,
    handleApoderadoChange,
    handleSubmit,
    setModal,
    navigate,
    loadError,
    edit: async (familiaId: number, payload: CreateFamiliaDTO) => {
      setLoading(true);
      setError(null);
      try {
        return await updateUseCase.execute(familiaId, payload);
      } catch {
        setError("No se pudo actualizar la familia");
        throw new Error("No se pudo actualizar la familia");
      } finally {
        setLoading(false);
      }
    },
  };
};

export const useEditAlumnoApoderado = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const updateUseCase = useMemo(
    () => new EditAlumnoApoderadoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const edit = async (familiaId: number, payload: CreateFamiliaDTO) => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      return await updateUseCase.execute(familiaId, payload);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "No se pudo actualizar la familia"
          : "No se pudo actualizar la familia",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { edit, loading, error, fieldErrors };
};
