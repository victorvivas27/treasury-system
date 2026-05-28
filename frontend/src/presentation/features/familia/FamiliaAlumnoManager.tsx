import { Button } from "@/shared/ui/button/Button";
import type { FC } from "react";
import { useFamiliaAlumno } from "@/presentation/hooks/familia/useFamiliaAlumno";
import "./style/FamiliaAlumnoManager.css";

interface FamiliaAlumnoManagerProps {
  alumnoId: number;
  onBack: () => void;
}

export const FamiliaAlumnoManager: FC<FamiliaAlumnoManagerProps> = ({ alumnoId, onBack }) => {
  const {
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
    reload,
  } = useFamiliaAlumno(alumnoId);

  return (
    <main className="familia-page">
      <header className="familia-header">
        <div>
          <h1 className="familia-header__title">Apoderados del Alumno</h1>
          <p className="familia-header__subtitle">Alumno ID {alumnoId}</p>
        </div>
        <div className="familia-header__actions">
          <Button variant="secondary" size="medium" onClick={reload} disabled={loading} label="Recargar" />
          <Button variant="secondary" size="medium" onClick={onBack} label="Volver" />
        </div>
      </header>

      <section className="familia-grid">
        <form className="familia-form">
          <h2 className="familia-section-title">
            {editingApoderadoId ? "Editar vínculo" : "Crear vínculo"}
          </h2>

          <label className="familia-field">
            <span>ID del apoderado</span>
            <input
              name="apoderadoId"
              type="number"
              min="1"
              value={formData.apoderadoId || ""}
              onChange={handleChange}
              disabled={Boolean(editingApoderadoId)}
            />
            {fieldErrors.apoderadoId && <small>{fieldErrors.apoderadoId}</small>}
          </label>

          <label className="familia-field">
            <span>Parentesco</span>
            <input
              name="parentesco"
              value={formData.parentesco}
              onChange={handleChange}
              placeholder="Padre, Madre, Tutor"
            />
            {fieldErrors.parentesco && <small>{fieldErrors.parentesco}</small>}
          </label>

          <label className="familia-check">
            <input
              name="principal"
              type="checkbox"
              checked={formData.principal}
              onChange={handleChange}
            />
            <span>Apoderado principal</span>
          </label>

          <label className="familia-field">
            <span>Observaciones</span>
            <textarea
              name="observaciones"
              value={formData.observaciones ?? ""}
              onChange={handleChange}
              rows={4}
            />
            {fieldErrors.observaciones && <small>{fieldErrors.observaciones}</small>}
          </label>

          {error && <p className="familia-message familia-message--error">{error}</p>}
          {message && <p className="familia-message familia-message--success">{message}</p>}

          <div className="familia-actions">
            <Button
              variant="primary"
              size="medium"
              onClick={submit}
              loading={loading}
              label={editingApoderadoId ? "Actualizar" : "Vincular"}
            />
            {editingApoderadoId && (
              <Button variant="secondary" size="medium" onClick={resetForm} label="Cancelar edición" />
            )}
          </div>
        </form>

        <article className="familia-list">
          <h2 className="familia-section-title">Vínculos registrados</h2>

          {loading && apoderados.length === 0 ? (
            <p className="familia-empty">Cargando vínculos...</p>
          ) : apoderados.length === 0 ? (
            <p className="familia-empty">No hay apoderados vinculados.</p>
          ) : (
            <table className="familia-table">
              <thead>
                <tr>
                  <th>Apoderado</th>
                  <th>Contacto</th>
                  <th>Parentesco</th>
                  <th>Principal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {apoderados.map((apoderado) => (
                  <tr key={apoderado.id}>
                    <td>
                      <strong>{apoderado.nombre}</strong>
                      <span>{apoderado.codigo}</span>
                    </td>
                    <td>
                      <span>{apoderado.email}</span>
                      <span>{apoderado.telefono}</span>
                    </td>
                    <td>{apoderado.parentesco}</td>
                    <td>{apoderado.principal ? "Sí" : "No"}</td>
                    <td>
                      <div className="familia-table__actions">
                        <Button variant="secondary" size="small" onClick={() => edit(apoderado)} label="Editar" />
                        <Button variant="danger" size="small" onClick={() => remove(apoderado.id)} label="Eliminar" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </main>
  );
};
