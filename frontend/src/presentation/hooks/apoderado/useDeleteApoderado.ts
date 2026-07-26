
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { useMemo, useState } from "react";

export const useDeleteApoderado = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [codigoToDelete, setCodigoToDelete] = useState<string | null>(null);
  const [alert, setAlert] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });
  const apoderadoRepository = useMemo(() => new ApoderadoRepositoryImpl(), []);
  const openDeleteConfirm = (codigo: string) => {
    setCodigoToDelete(codigo);
  };

  const closeDeleteConfirm = () => {
    setCodigoToDelete(null);
  };

  const confirmDelete = async () => {
    if (codigoToDelete === null) return;

    setIsDeleting(true);

    try {
      await apoderadoRepository.delete(codigoToDelete);

      setAlert({
        isOpen: true,
        message: "Apoderado eliminado correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch {
      setAlert({
        isOpen: true,
        message: "No se pudo eliminar el apoderado.",
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
    isConfirmOpen: codigoToDelete !== null,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    alert,
    closeAlert,
  };
};
