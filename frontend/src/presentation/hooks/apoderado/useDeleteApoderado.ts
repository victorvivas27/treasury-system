import { ApoderadoRepositoryImpl } from "@/core/infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useMemo, useState } from "react";

// Instanciamos el repositorio


export const useDeleteApoderado = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [alert, setAlert] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });
// Instanciación dentro del hook para mejorar la testabilidad
  const apoderadoRepository = useMemo(() => new ApoderadoRepositoryImpl(), []);
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
      await apoderadoRepository.delete(idToDelete);

      setAlert({
        isOpen: true,
        message: "Apoderado eliminado correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error al eliminar apoderado:", error);

      setAlert({
        isOpen: true,
        message: "No se pudo eliminar el apoderado.",
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
