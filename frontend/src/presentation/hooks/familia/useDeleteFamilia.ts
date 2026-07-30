
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import { DeleteAlumnoApoderadoUseCase } from "@/core/B-application/use-cases/familia/delete/DeleteAlumnoApoderadoUseCase";
import { useMemo, useState } from "react";

export const useDeleteFamilia = (onSuccess?: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    try {
      await familiaRepository.delete(idToDelete);

      setAlert({
        isOpen: true,
        message: "Familia eliminada correctamente.",
        type: "success",
      });

      onSuccess?.();
    } catch {
      setError("No se pudo eliminar la familia.");

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
    loading: isDeleting,
    error,
    idToDelete,
    isConfirmOpen: idToDelete !== null,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    remove: async (id: number) => {
      setIdToDelete(id);
      setIsDeleting(true);
      setError(null);
      try {
        await familiaRepository.delete(id);
      } catch {
        setError("No se pudo eliminar la familia.");
      } finally {
        setIsDeleting(false);
        setIdToDelete(null);
      }
    },
    alert,
    closeAlert,
  };
};

export const useDeleteAlumnoApoderado = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteUseCase = useMemo(
    () => new DeleteAlumnoApoderadoUseCase(new FamiliaRepositoryImpl()),
    [],
  );

  const remove = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteUseCase.execute(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar la familia.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
};
