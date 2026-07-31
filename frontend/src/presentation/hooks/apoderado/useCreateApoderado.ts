import { CreateApoderadoUseCase } from "@/core/B-application/use-cases/apoderado/create/CreateApoderadoUseCase";
import type { CreateApoderadoDTO } from "@/core/A-domain/entities/apoderado/Apoderado";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import axios from "axios";
import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { validateTelefono } from "@/shared/validation/apoderadoValidation";

export const useCreateApoderado = () => {
  const navigate = useNavigate();
  const initialFormState: CreateApoderadoDTO = {
    nombre: "",
    email: "",
    telefono: "",
    observaciones: "",
  };

  const [formData, setFormData] = useState<CreateApoderadoDTO>({
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
    if (modal.type === "success") navigate("/parents");
  };

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

  const handleActionSubmit = async () => {
    setFieldErrors({});

    const telefonoError = validateTelefono(formData.telefono);
    if (telefonoError) {
      setFieldErrors({ telefono: telefonoError });
      return;
    }

    setLoading(true);

    const repository = new ApoderadoRepositoryImpl();
    const useCase = new CreateApoderadoUseCase(repository);

    try {
      await useCase.execute(formData);

      showAlert("¡Datos guardados con éxito!", "success");
      setFormData(initialFormState);
      setFieldErrors({});
      
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
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    closeModal,
    navigate,
    setModal,
  };
};
