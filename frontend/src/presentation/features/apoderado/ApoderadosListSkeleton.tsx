import "./style/ApoderadosListSkeleton.css";

export const ApoderadosListSkeleton: React.FC = () => {
  // Ponemos 5 para que parezca una lista real cargando
  const skeletonRows = Array(2).fill(null);

  return (
    <article className="apoderados-container">
      <header className="apoderados-header">
        <h2 className="apoderados-header__title">Lista de Apoderados</h2>
      </header>

      <div className="apoderados-table-wrapper">
        <table className="apoderados-table">
          <thead className="apoderados-table__head">
            <tr className="apoderados-table__row">
              <th className="apoderados-table__th">Nombre Completo</th>
              <th className="apoderados-table__th">Correo Electrónico</th>
              <th className="apoderados-table__th">Teléfono</th>
            </tr>
          </thead>
          <tbody className="apoderados-table__body">
            {skeletonRows.map((_, index) => (
              <tr key={index} className="apoderados-table__row--data">
                <td className="apoderados-table__td">
                  <div className="skeleton-block w-80"></div>
                </td>
                <td className="apoderados-table__td">
                  <div className="skeleton-block w-90"></div>
                </td>
                <td className="apoderados-table__td">
                  <div className="skeleton-block w-60"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
};
