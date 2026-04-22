import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";

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
  if (loading) {
    return (
      <div className="">
        <div className="">Cargando apoderados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="">
        <p>Error: {error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className=""
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (apoderados.length === 0) {
    return (
      <div className="">
        No hay apoderados registrados
      </div>
    );
  }

  return (
    <div className="">
      <table className="">
        <thead>
          <tr className="">
            <th className="">
              Nombre
            </th>
            <th className="">
              Email
            </th>
            <th className="">
              Teléfono
            </th>
           
          </tr>
        </thead>
        <tbody className="">
          {apoderados.map((apoderado) => (
            <tr key={apoderado.id} className="">
              <td className="">
                {apoderado.nombre} {apoderado.apellido}
              </td>
              <td className="">{apoderado.email}</td>
              <td className="">{apoderado.telefono}</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
