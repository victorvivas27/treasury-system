
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import { useMemo, useState } from "react";

export const useDeleteFamilia = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [alert, setAlert] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });
  const familiaRepository = useMemo(() => new FamiliaRepositoryImpl(), []);
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
      await familiaRepository.delete(idToDelete);

      setAlert({
        isOpen: true,
        message: "Familia eliminada correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error al eliminar familia:", error);

      setAlert({
        isOpen: true,
        message: "No se pudo eliminar la familia.",
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
