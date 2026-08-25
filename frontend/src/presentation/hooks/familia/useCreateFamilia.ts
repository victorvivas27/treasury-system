import type { CreateFamiliaDTO } from "@/core/A-domain/entities/familia/Familia";

import { CreateAlumnoApoderadoUseCase } from "@/core/B-application/use-cases/familia/create/CreateAlumnoApoderadoUseCase";
import { CreateFamiliaUseCase } from "@/core/B-application/use-cases/familia/create/CreateFamiliaUseCase";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import axios from "axios";
import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAlumnos } from "../alumno/useAlumnos";
import { useApoderados } from "../apoderado/useApoderados";



export const useCreateFamilia = () => {

    const {
    alumnos: alumnosRegistrados,
    loading: loadingAlumnos,
    error: alumnosError,
  } = useAlumnos({ pageSize: 100 });

  const {
    apoderados: apoderadosRegistrados,
    loading: loadingApoderados,
    error: apoderadosError,
  } = useApoderados({ pageSize: 100 });

  const alumnos = alumnosRegistrados.filter((alumno) => alumno.activo !== false);
  const apoderados = apoderadosRegistrados.filter((apoderado) => apoderado.activo !== false);

  const navigate = useNavigate();
  const initialFormState: CreateFamiliaDTO = {
    observacionesGenerales: "",
    apoderados: [
      {
        apoderadoId: 0,
        parentesco: "",
        esPrincipal: true,
      },
    ],
    alumnoId: 0
  };


  const [formData, setFormData] = useState<CreateFamiliaDTO>({
    ...initialFormState,
    apoderados: [...(initialFormState.apoderados ?? [])],
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showAlert = (message: string, type: "success" | "error") => {
    setModal({ isOpen: true, message, type });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));

    if (modal.type === "success") {
      navigate("/family");
    }
  };

  const handleHeaderChange = (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "alumnoId" ? (value ? Number(value) : undefined) : value,
    }));

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
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;

    setFormData((prev) => ({
      ...prev,
      apoderados: (prev.apoderados ?? []).map((relacion, currentIndex) => {
        if (name === "esPrincipal" && checked && currentIndex !== index) {
          return {
            ...relacion,
            esPrincipal: false,
          };
        }

        if (currentIndex !== index) {
          return relacion;
        }

        return {
          ...relacion,
          [name]:
            type === "checkbox"
              ? checked
              : name === "apoderadoId"
                ? Number(value)
                : value,
        };
      }),
    }));

    const fieldName = `apoderados.${index}.${name}`;

    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const addApoderado = () => {
    setFormData((prev) => ({
      ...prev,
      apoderados: [
        ...(prev.apoderados ?? []),
        {
          apoderadoId: 0,
          parentesco: "",
          esPrincipal: false,
        },
      ],
    }));
  };

  const setAlumnoId = (alumnoId: number) => {
    setFormData((prev) => ({ ...prev, alumnoId }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.alumnoId;
      return next;
    });
  };

  const setApoderadoId = (index: number, apoderadoId: number) => {
    setFormData((prev) => ({
      ...prev,
      apoderados: (prev.apoderados ?? []).map((relacion, currentIndex) =>
        currentIndex === index ? { ...relacion, apoderadoId } : relacion,
      ),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`apoderados.${index}.apoderadoId`];
      return next;
    });
  };

  const setParentesco = (index: number, parentesco: string) => {
    setFormData((prev) => ({
      ...prev,
      apoderados: (prev.apoderados ?? []).map((relacion, currentIndex) =>
        currentIndex === index ? { ...relacion, parentesco } : relacion,
      ),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`apoderados.${index}.parentesco`];
      return next;
    });
  };

  const removeApoderado = (index: number) => {
    setFormData((prev) => {
      const apoderadosActualizados = (prev.apoderados ?? []).filter(
        (_, currentIndex) => currentIndex !== index,
      );

      if (
        apoderadosActualizados.length > 0 &&
        !apoderadosActualizados.some((relacion) => relacion.esPrincipal)
      ) {
        apoderadosActualizados[0] = {
          ...apoderadosActualizados[0],
          esPrincipal: true,
        };
      }

      return {
        ...prev,
        apoderados: apoderadosActualizados,
      };
    });
  };

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      apoderados: [...(initialFormState.apoderados ?? [])],
    });
  };

  const handleActionSubmit = async () => {
    const validationErrors: Record<string, string> = {};

    if (!formData.alumnoId) {
      validationErrors.alumnoId = "Seleccione un alumno";
    }

    if (!formData.apoderados?.length) {
      validationErrors.apoderados = "Agregue al menos un apoderado";
    } else {
      formData.apoderados.forEach((relacion, index) => {
        if (!relacion.apoderadoId) {
          validationErrors[`apoderados.${index}.apoderadoId`] =
            "Seleccione un apoderado";
        }
        if (!relacion.parentesco?.trim()) {
          validationErrors[`apoderados.${index}.parentesco`] =
            "Seleccione un parentesco";
        }
      });

      if (!formData.apoderados.some((relacion) => relacion.esPrincipal)) {
        validationErrors.apoderados = "Seleccione un apoderado principal";
      }
    }

    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    const repository = new FamiliaRepositoryImpl();
    const useCase = new CreateFamiliaUseCase(repository);

    const payload: CreateFamiliaDTO = {
      alumnoId: formData.alumnoId,
      observacionesGenerales: formData.observacionesGenerales || null,
      apoderados: formData.apoderados ?? [],
    };

    try {
      await useCase.execute(payload);
      showAlert("¡Familia creada con éxito!", "success");
      resetForm();
    } catch (error: unknown) {
      if (!axios.isAxiosError(error) || !error.response) {
        showAlert("Ocurrió un error inesperado", "error");
        return;
      }

      const { code, errors, message } = error.response.data;

     if (code === "ERROR_VALIDACION" && errors) {
      // Mostrar todos los errores en un mensaje legible
      const errorMessages = Object.values(errors).join('\n');
      showAlert(errorMessages, "error");
      return;
    }

    // Caso 2: Errores específicos de alumno (AL-xxx)
    if (code?.startsWith('AL-')) {
      showAlert(message || "Error con el alumno", "error");
      return;
    }
     if (code?.startsWith('AP-')) {
      showAlert(message || "Error con el apoderado", "error");
      return;
    }

      showAlert(message || "Error al procesar la solicitud", "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    fieldErrors,
    modal,
    handleHeaderChange,
    handleApoderadoChange,
    setAlumnoId,
    setApoderadoId,
    setParentesco,
    addApoderado,
    removeApoderado,
    handleActionSubmit,
    closeModal,
    navigate,
    setModal,
    apoderados,
    alumnos,
    loadingAlumnos,
    loadingApoderados,
    alumnosError,
    apoderadosError,
  };
};

export const useCreateAlumnoApoderado = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const create = async (payload: CreateFamiliaDTO) => {
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const useCase = new CreateAlumnoApoderadoUseCase(new FamiliaRepositoryImpl());
      return await useCase.execute(payload);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "No se pudo crear el vinculo"
          : "No se pudo crear el vinculo",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error, fieldErrors };
};
