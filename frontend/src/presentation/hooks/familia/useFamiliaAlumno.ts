import { CreateFamiliaUseCase } from "@/core/B-application/use-cases/familia/create/CreateFamiliaUseCase";
import { DeleteFamiliaUseCase } from "@/core/B-application/use-cases/familia/delete/DeleteFamiliaUseCase";
import { GetFamiliaByAlumnoUseCase } from "@/core/B-application/use-cases/familia/list/GetFamiliaByAlumnoUseCase";
import { UpdateFamiliaUseCase } from "@/core/B-application/use-cases/familia/update/UpdateFamiliaUseCase";
import type {
  AlumnoApoderado,
  CreateFamiliaDTO,
  UpdateFamiliaDTO,
} from "@/core/A-domain/entities/familia/Familia";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

const initialFormState: CreateFamiliaDTO = {
  apoderadoId: 0,
  parentesco: "",
  principal: false,
  observaciones: "",
};

export const useFamiliaAlumno = (alumnoId: number | undefined) => {
  const [apoderados, setApoderados] = useState<AlumnoApoderado[]>([]);
  const [formData, setFormData] = useState<CreateFamiliaDTO>(initialFormState);
  const [editingApoderadoId, setEditingApoderadoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const useCases = useMemo(() => {
    const repository = new FamiliaRepositoryImpl();
    return {
      create: new CreateFamiliaUseCase(repository),
      list: new GetFamiliaByAlumnoUseCase(repository),
      update: new UpdateFamiliaUseCase(repository),
      delete: new DeleteFamiliaUseCase(repository),
    };
  }, []);

  const loadApoderados = useCallback(async () => {
    if (!alumnoId || Number.isNaN(alumnoId)) {
      setError("ID de alumno no válido");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await useCases.list.execute(alumnoId);
      setApoderados(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar vínculos");
    } finally {
      setLoading(false);
    }
  }, [alumnoId, useCases]);

  useEffect(() => {
    loadApoderados();
  }, [loadApoderados]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    const checked = "checked" in event.target ? event.target.checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? checked
        : name === "apoderadoId"
          ? (value ? Number(value) : 0)
          : value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingApoderadoId(null);
    setFieldErrors({});
  };

  const edit = (apoderado: AlumnoApoderado) => {
    setEditingApoderadoId(apoderado.id);
    setFormData({
      apoderadoId: apoderado.id,
      parentesco: apoderado.parentesco,
      principal: apoderado.principal,
      observaciones: apoderado.observaciones ?? "",
    });
    setFieldErrors({});
    setMessage(null);
  };

  const submit = async () => {
    if (!alumnoId || Number.isNaN(alumnoId)) {
      setError("ID de alumno no válido");
      return;
    }

    try {
      setLoading(true);
      setFieldErrors({});
      setMessage(null);

      if (editingApoderadoId) {
        const data: UpdateFamiliaDTO = {
          parentesco: formData.parentesco,
          principal: formData.principal,
          observaciones: formData.observaciones,
        };
        await useCases.update.execute(alumnoId, editingApoderadoId, data);
        setMessage("Vínculo actualizado");
      } else {
        await useCases.create.execute(alumnoId, formData);
        setMessage("Vínculo creado");
      }

      resetForm();
      await loadApoderados();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "No se pudo guardar el vínculo"
          : "No se pudo guardar el vínculo",
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async (apoderadoId: number) => {
    if (!alumnoId || Number.isNaN(alumnoId)) return;

    try {
      setLoading(true);
      setError(null);
      await useCases.delete.execute(alumnoId, apoderadoId);
      setMessage("Vínculo eliminado");
      await loadApoderados();
    } catch {
      setError("No se pudo eliminar el vínculo");
    } finally {
      setLoading(false);
    }
  };

  return {
    apoderados,
    formData,
    editingApoderadoId,
    loading,
    error,
    fieldErrors,
    message,
    handleChange,
    submit,
    edit,
    remove,
    resetForm,
    reload: loadApoderados,
  };
};
