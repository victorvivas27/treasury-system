import { GetAlumnoByIdUseCase } from "@/core/B-application/use-cases/alumno/get/GetAlumnoByIdUseCase";
import { UpdateAlumnoUseCase } from "@/core/B-application/use-cases/alumno/update/UpdateAlumnoUseCase";
import type { CreateAlumnoDTO } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";


export const useEditAlumno = () => {
  const navigate = useNavigate();
  const params = useParams();
  const codigo = params.codigo ?? params.id;
  const legacyNumericId = params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const invalidLegacyId = params.id !== undefined && params.codigo === undefined && legacyNumericId === undefined;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string } | null>(null);

  const { getUseCase, updateUseCase } = useMemo(() => {
    const repository = new AlumnoRepositoryImpl();
    return {
      getUseCase: new GetAlumnoByIdUseCase(repository),
      updateUseCase: new UpdateAlumnoUseCase(repository),
    };
  }, []);

  const [formData, setFormData] = useState<CreateAlumnoDTO>({
    nombre: "",
    curso: "",
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

  const loadAlumnoData = useCallback(async () => {
    if (!codigo || invalidLegacyId) {
      setLoadError({ message: "ID de alumno no válido" });
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setLoadError(null);

    try {
      const alumno = await getUseCase.execute((legacyNumericId ?? codigo) as string);

      if (!alumno) {
        setLoadError({ message: "El alumno no existe en el sistema" });
        showAlert("El alumno no existe", "error");
        setTimeout(() => navigate("/students"), 2000);
        return;
      }

      setFormData({
        nombre: alumno.nombre,
        curso: alumno.curso,
        ...("apoderadoId" in alumno ? { apoderadoId: alumno.apoderadoId } : {}),
      });
    } catch {
      setLoadError({ message: "Error de conexión al cargar los datos" });
      showAlert("Error al cargar los datos del alumno", "error");
      setTimeout(() => navigate("/students"), 2000);
    } finally {
      setInitialLoading(false);
    }
  }, [codigo, getUseCase, navigate, showAlert]);

  useEffect(() => {
    loadAlumnoData();
  }, [loadAlumnoData]);

  // ✅ handleChange SIMPLIFICADO - sin lógica de apoderadoId
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name.endsWith("Id") ? Number(value) : value,
    }));

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!codigo || invalidLegacyId) {
      setLoadError({ message: "ID de alumno no válido" });
      return;
    }

    setLoading(true);
    setFieldErrors({});

    try {
      await updateUseCase.execute((legacyNumericId ?? codigo) as string, formData);
      showAlert("¡Alumno actualizado con éxito!", "success");

      setTimeout(() => {
        navigate("/students");
      }, 2000);
    } catch (error: any) {
      if (!axios.isAxiosError(error) || !error.response) {
        showAlert("Ocurrió un error inesperado", "error");
        return;
      }

      const { errors, message } = error.response.data;

      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
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
