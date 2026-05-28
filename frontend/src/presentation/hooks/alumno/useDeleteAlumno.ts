import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { useMemo, useState } from "react";

export const useDeleteAlumno = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [alert, setAlert] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const alumnoRepository = useMemo(() => new AlumnoRepositoryImpl(), []);

  const openDeleteConfirm = (id: number) => {
    setIdToDelete(id);
  };

  const closeDeleteConfirm = () => {
    setIdToDelete(null);
  };

  const confirmDelete = async () => {
    if (idToDelete === null) return;

    setIsDeleting(true);

    try {
      await alumnoRepository.delete(idToDelete);

      setAlert({
        isOpen: true,
        message: "Alumno eliminado correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error al eliminar alumno:", error);

      setAlert({
        isOpen: true,
        message: "No se pudo eliminar el alumno.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setIdToDelete(null);
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
    idToDelete,
    isConfirmOpen: idToDelete !== null,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  };
};
