import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import "./style/ApoderadosList.css";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ApoderadosListSkeleton } from "./ApoderadosListSkeleton";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";
import { FcHighPriority } from "react-icons/fc";
import { Button } from "@/shared/ui/button/Button";


interface ApoderadosListProps {
  apoderados: Apoderado[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  handleDelete?: (id: number) => void; // <--- Nueva Prop

}

export const ApoderadosList: React.FC<ApoderadosListProps> = ({
  apoderados,
  loading,
  error,
  onRefresh,
  handleDelete,
}) => {
  // Estado de Carga
  if (loading) {
    return <ApoderadosListSkeleton />;
  }

  // Estado de Error
  if (error) {
    return (
      <FeedbackState
        message={error}
        onRefresh={onRefresh}
        type="error"
        icon={<FcHighPriority />}
      />
    );
  }

  // Estado Vacío
  if (apoderados.length === 0) {
    return (
      <EmptyState
        title="No hay apoderados"
        message="No se encontraron apoderados registrados en el sistema."
        icon={<APODERADOS_ICONS.conference />}
      />
    );
  }


  return (
    <article className="apoderados-container">
      <header className="apoderados-header">
        <h2 className="apoderados-header__title">Lista de Apoderados</h2>
      </header>

      <div className="apoderados-table-wrapper">
        <table className="apoderados-table">
          <thead>
            <tr >
              <th className="apoderados-table__th">Nombre Completo</th>
              <th className="apoderados-table__th">Correo Electrónico</th>
              <th className="apoderados-table__th">Teléfono</th>
              <th className="apoderados-table__th">Acciones</th>
            </tr>
          </thead>
          <tbody className="apoderados-table__body">
            {apoderados.map((apoderado) => (
              <tr key={apoderado.id} className="apoderados-table__row--data">
                <td className="apoderados-table__td" data-label="Nombre">
                  {apoderado.nombre}
                </td>
                <td className="apoderados-table__td" data-label="Email">
                  {apoderado.email}
                </td>
                <td className="apoderados-table__td" data-label="Teléfono">
                  {apoderado.telefono}
                </td>

                <td className="apoderados-table__td" data-label="Acciones">
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleDelete?.(apoderado.id)}
                    icon={<APODERADOS_ICONS.delete style={{ fontSize: '1.2rem' }} />}
                    loading={loading}
                    disabled={loading}
                    testId={`delete-btn-${apoderado.id}`}
                  />
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
