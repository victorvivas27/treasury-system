
import type { AlumnoApoderado, UpdateFamiliaDTO } from "@/core/A-domain/entities/familia/Familia";
import { GetFamiliaByAlumnoUseCase } from "@/core/B-application/use-cases/familia/byid/GetFamiliaByAlumnoUseCase";
import { UpdateFamiliaUseCase } from "@/core/B-application/use-cases/familia/update/UpdateFamiliaUseCase";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

export const useEditFamilia = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const numericId = useMemo(() => (id ? parseInt(id, 10) : undefined), [id]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string } | null>(null);
  const [familiaData, setFamiliaData] = useState<AlumnoApoderado | null>(null);

  // Guardar los IDs de la relación por separado
  const [relacionIds, setRelacionIds] = useState<{ alumnoId: number; apoderadoId: number } | null>(null);

  const { getUseCase, updateUseCase } = useMemo(() => {
    const repository = new FamiliaRepositoryImpl();
    return {
      getUseCase: new GetFamiliaByAlumnoUseCase(repository),
      updateUseCase: new UpdateFamiliaUseCase(repository),
    };
  }, []);

  const [formData, setFormData] = useState<UpdateFamiliaDTO>({
    parentesco: "",
    principal: false,
    observaciones: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showAlert = useCallback(
    (message: string, type: "success" | "error") => {
      setModal({ isOpen: true, message, type });
    },
    [],
  );

  const loadFamiliaData = useCallback(async () => {
    if (numericId === undefined || isNaN(numericId)) {
      setLoadError({ message: "ID de alumno no válido" });
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setLoadError(null);

    try {
      const relaciones = await getUseCase.execute(numericId);

      // Toma la primera relación o la que es principal
      const relacion = relaciones.find(r => r.principal) || relaciones[0];

      if (!relacion) {
        setLoadError({ message: "No hay relaciones familiares para este alumno" });
        showAlert("No hay relaciones familiares", "error");
        setTimeout(() => navigate("/family"), 2000);
        return;
      }

      setFamiliaData(relacion);

      // IMPORTANTE: Necesitas guardar el alumnoId y apoderadoId en otro lado
      // Como AlumnoApoderado no tiene esos campos, tendrás que obtenerlos de otra forma
      // Por ahora, usamos numericId como alumnoId, pero necesitas el apoderadoId

      setRelacionIds({
        alumnoId: numericId,
        apoderadoId: relacion.id, // Esto es incorrecto: relacion.id es el ID del apoderado, no el ID de la relación
      });

      setFormData({
        parentesco: relacion.parentesco,
        principal: relacion.principal,
        observaciones: relacion.observaciones || "",
      });
    } catch {
      setLoadError({ message: "Error de conexión al cargar los datos" });
      showAlert("Error al cargar los datos de la familia", "error");
      setTimeout(() => navigate("/family"), 2000);
    } finally {
      setInitialLoading(false);
    }
  }, [numericId, getUseCase, navigate, showAlert]);

  useEffect(() => {
    loadFamiliaData();
  }, [loadFamiliaData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!relacionIds) return;

    setLoading(true);
    setFieldErrors({});

    try {
      await updateUseCase.execute(relacionIds.alumnoId, relacionIds.apoderadoId, formData);
      showAlert("¡Familia actualizada con éxito!", "success");

      setTimeout(() => {
        navigate("/family");
      }, 2000);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const { code, errors, message } = error.response.data;
        if (code === "ERROR_VALIDACION" && errors) {
          setFieldErrors(errors);
        } else {
          showAlert(message || "Error al procesar la solicitud", "error");
        }
      } else {
        showAlert("Ocurrió un error inesperado", "error");
      }
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
    modal,
    handleChange,
    handleSubmit,
    setModal,
    navigate,
    loadError,
  };
};
