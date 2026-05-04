
import { GetApoderadoByIdUseCase } from "@/core/application/use-cases/apoderado/byid/GetApoderadoByIdUseCase";
import { UpdateApoderadoUseCase } from "@/core/application/use-cases/apoderado/update/UpdateApoderadoUseCase";
import type { CreateApoderadoDTO } from "@/core/domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl";
import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

export const useEditApoderado = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Memorizamos el ID numérico para evitar recálculos innecesarios
  const numericId = useMemo(() => (id ? parseInt(id, 10) : undefined), [id]);

  // Estados de carga (Entrada y Salida)
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
const [loadError, setLoadError] = useState<{ message: string } | null>(null);

  // Instancias de arquitectura (Memorizadas para evitar recreación en cada render)
  const { getUseCase, updateUseCase } = useMemo(() => {
    const repository = new ApoderadoRepositoryImpl();
    return {
      getUseCase: new GetApoderadoByIdUseCase(repository),
      updateUseCase: new UpdateApoderadoUseCase(repository),
    };
  }, []);

  const [formData, setFormData] = useState<CreateApoderadoDTO>({
    nombre: "",
    email: "",
    telefono: "",
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

  const loadApoderadoData = useCallback(async () => {
    if (numericId === undefined || isNaN(numericId)) {
    setLoadError({ message: "ID de apoderado no válido" });
    setInitialLoading(false); // <--- Agrega esto
      return;
    }

    setInitialLoading(true);
    setLoadError(null);

    try {
      const apoderado = await getUseCase.execute(numericId);

      if (!apoderado) {
        setLoadError({ message: "El apoderado no existe en el sistema" });
        showAlert("El apoderado no existe", "error");
        setTimeout(() => navigate("/parents"), 2000);
        return;
      }

      setFormData({
        nombre: apoderado.nombre,
        email: apoderado.email,
        telefono: apoderado.telefono,
        observaciones: apoderado.observaciones || "",
      });
    } catch {
     setLoadError({ message: "Error de conexión al cargar los datos" });
      showAlert("Error al cargar los datos del apoderado", "error");
      setTimeout(() => navigate("/parents"), 2000);
    } finally {
      setInitialLoading(false);
    }
  }, [numericId, getUseCase, navigate, showAlert]);

  useEffect(() => {
    loadApoderadoData();
  }, [loadApoderadoData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (numericId === undefined || isNaN(numericId)) return;

    setLoading(true);
    setFieldErrors({});

    try {
      await updateUseCase.execute(numericId, formData);
      showAlert("¡Apoderado actualizado con éxito!", "success");

      setTimeout(() => {
        navigate("/parents");
      }, 2000);
    } catch (error: any) {
      // Importante: No retornamos inmediatamente sin apagar el loading
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
