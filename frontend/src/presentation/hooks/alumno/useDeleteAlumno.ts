import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import axios from "axios";
import { useMemo, useState } from "react";

export const useDeleteAlumno = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [codigoToDelete, setCodigoToDelete] = useState<string | number | null>(null);
  const [alert, setAlert] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const alumnoRepository = useMemo(() => new AlumnoRepositoryImpl(), []);

  const openDeleteConfirm = (codigo: string | number) => {
    setCodigoToDelete(codigo);
  };

  const closeDeleteConfirm = () => {
    setCodigoToDelete(null);
  };

  const confirmDelete = async () => {
    if (codigoToDelete === null) return;

    setIsDeleting(true);

    try {
      const repository = alumnoRepository as AlumnoRepositoryImpl & {
        delete?: (id: number) => Promise<void>;
      };
      if (typeof repository.delete === "function" && typeof codigoToDelete === "number") {
        await repository.delete(codigoToDelete);
      } else {
        await repository.deleteByCodigo(String(codigoToDelete));
      }

      setAlert({
        isOpen: true,
        message: "Alumno eliminado correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch (error) {
      const responseErrors = axios.isAxiosError(error)
        ? error.response?.data?.errors
        : undefined;
      const apiMessage = responseErrors && typeof responseErrors === "object"
        ? Object.values(responseErrors).find(
            (message): message is string => typeof message === "string",
          )
        : undefined;

      setAlert({
        isOpen: true,
        message: apiMessage ?? "No se pudo eliminar el alumno.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setCodigoToDelete(null);
    }
  };

  const closeAlert = () => {
    setAlert((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  return {
    isDeleting,
    codigoToDelete,
    idToDelete: codigoToDelete,
    isConfirmOpen: codigoToDelete !== null,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  };
};
