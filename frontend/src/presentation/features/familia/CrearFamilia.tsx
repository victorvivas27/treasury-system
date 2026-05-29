import type { CreateFamiliaDTO, FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { useAlumnos } from "@/presentation/hooks/alumno/useAlumnos";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import { useCreateFamilia } from "@/presentation/hooks/familia/useCreateFamilia";
import { useEditFamilia } from "@/presentation/hooks/familia/useEditFamilia";
import { useListFamilia } from "@/presentation/hooks/familia/useListFamilia";
import { Button } from "@/shared/ui/button/Button";
import { useState, type ChangeEvent } from "react";



const initialForm: CreateFamiliaDTO = {
  alumnoId: 0,
  apoderadoId: 0,
  parentesco: "",
  principal: false,
  observaciones: "",
};
export const CrearFamilia = () => {
  const [formData, setFormData] = useState<CreateFamiliaDTO>(initialForm);
  const [editing, setEditing] = useState<FamiliaDetalle | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { alumnos } = useAlumnos({ pageSize: 100 });
  const { apoderados } = useApoderados({ pageSize: 100 });
  const {
    refetch,

  } = useListFamilia();

  const createHook = useCreateFamilia();
  const editHook = useEditFamilia();

  const saving = createHook.loading || editHook.loading;
  const formErrors = editing ? editHook.fieldErrors : createHook.fieldErrors;
  const formError = editing ? editHook.error : createHook.error;

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    const checked = "checked" in event.target ? event.target.checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? checked
        : name === "alumnoId" || name === "apoderadoId"
          ? (value ? Number(value) : 0)
          : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditing(null);
  };



  const submit = async () => {
    try {
      if (editing) {
        await editHook.edit(editing.id, {
          parentesco: formData.parentesco,
          principal: formData.principal,
          observaciones: formData.observaciones,
        });
        setMessage("Vínculo actualizado");
      } else {
        await createHook.create(formData);
        setMessage("Vínculo creado");
      }
      resetForm();
      await refetch();
    } catch {
      setMessage(null);
    }
  };
  return (
    <section className="familia-grid">
      <form className="familia-form">
        <h2 className="familia-section-title">{editing ? "Editar vínculo" : "Crear vínculo"}</h2>

        <label className="familia-field">
          <span>Alumno</span>
          <select name="alumnoId" value={formData.alumnoId || ""} onChange={handleChange} disabled={Boolean(editing)}>
            <option value="">Seleccionar alumno</option>
            {alumnos.map((alumno) => (
              <option key={alumno.id} value={alumno.id}>
                {alumno.codigo} - {alumno.nombre} - {alumno.curso}
              </option>
            ))}
          </select>
          {formErrors.alumnoId && <small>{formErrors.alumnoId}</small>}
        </label>

        <label className="familia-field">
          <span>Apoderado</span>
          <select
            name="apoderadoId"
            value={formData.apoderadoId || ""}
            onChange={handleChange}
            disabled={Boolean(editing)}
          >
            <option value="">Seleccionar apoderado</option>
            {apoderados.map((apoderado) => (
              <option key={apoderado.id} value={apoderado.id}>
                {apoderado.codigo} - {apoderado.nombre}
              </option>
            ))}
          </select>
          {formErrors.apoderadoId && <small>{formErrors.apoderadoId}</small>}
        </label>

        <label className="familia-field">
          <span>Parentesco</span>
          <input name="parentesco" value={formData.parentesco} onChange={handleChange} />
          {formErrors.parentesco && <small>{formErrors.parentesco}</small>}
        </label>

        <label className="familia-check">
          <input name="principal" type="checkbox" checked={formData.principal} onChange={handleChange} />
          <span>Apoderado principal</span>
        </label>

        <label className="familia-field">
          <span>Observaciones</span>
          <textarea name="observaciones" value={formData.observaciones ?? ""} onChange={handleChange} rows={4} />
        </label>

        {formError && <p className="familia-message familia-message--error">{formError}</p>}
        {message && <p className="familia-message familia-message--success">{message}</p>}

        <div className="familia-actions">
          <Button
            variant="primary"
            size="medium"
            onClick={submit}
            loading={saving}
            label={editing ? "Actualizar" : "Crear vínculo"}
          />
          {editing && <Button variant="secondary" size="medium" onClick={resetForm} label="Cancelar" />}
        </div>
      </form>

    </section>
  )
}


