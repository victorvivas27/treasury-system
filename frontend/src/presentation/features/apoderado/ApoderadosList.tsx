import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import "./ApoderadosList.css";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ApoderadosListSkeleton } from "./ApoderadosListSkeleton";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { FcConferenceCall } from "react-icons/fc";

interface ApoderadosListProps {
  apoderados: Apoderado[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export const ApoderadosList: React.FC<ApoderadosListProps> = ({
  apoderados,
  loading,
  error,
  onRefresh,
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
      />
    );
  }

  // Estado Vacío
  if (apoderados.length === 0) {
     return (
    <EmptyState
      title="No hay apoderados"
      message="No se encontraron apoderados registrados en el sistema."
      icon={<FcConferenceCall />}
    />
  );
  }

  // Renderizado de Tabla Semántica
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
            </tr>
          </thead>
          <tbody className="apoderados-table__body">
            {apoderados.map((apoderado) => (
              <tr key={apoderado.id} className="apoderados-table__row--data">
                <td className="apoderados-table__td" data-label="Nombre">
                  {apoderado.nombre} {apoderado.apellido}
                </td>
                <td className="apoderados-table__td" data-label="Email">
                  {apoderado.email}
                </td>
                <td className="apoderados-table__td" data-label="Teléfono">
                  {apoderado.telefono}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
