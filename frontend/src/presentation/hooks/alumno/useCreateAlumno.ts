import { CreateAlumnoUseCase } from "@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase";
import type { CreateAlumnoDTO } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import axios from "axios";
import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

export const useCreateAlumno = () => {
  const navigate = useNavigate();
  const initialFormState: CreateAlumnoDTO = {
    nombre: "",
    curso: "",
  };

  const [formData, setFormData] = useState<CreateAlumnoDTO>({
    ...initialFormState,
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
    if (modal.type === "success") navigate("/students");
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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

  const handleActionSubmit = async () => {
    setLoading(true);
    setFieldErrors({});
    const repository = new AlumnoRepositoryImpl();
    const useCase = new CreateAlumnoUseCase(repository);

    try {
      await useCase.execute(formData);
      showAlert("¡Datos guardados con éxito!", "success");
      setFormData(initialFormState);
    } catch (error: any) {
      if (!axios.isAxiosError(error) || !error.response) {
        showAlert("Ocurrió un error inesperado", "error");
        return;
      }
      const { code, errors, message } = error.response.data;
      if (code === "ERROR_VALIDACION" && errors) {
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
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    closeModal,
    navigate,
    setModal,
  };
};
