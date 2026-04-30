import "./style/ApoderadosListSkeleton.css";

export const ApoderadosListSkeleton = () => {
  // 5 filas para simular 5 registros
  const skeletonRows = Array(1).fill(0);

  return (
    <article className="apoderados-container">
      <header className="apoderados-header">
        <h2 className="apoderados-header__title">Lista de Apoderados</h2>
      </header>

      <div className="apoderados-table-wrapper">
        <table className="apoderados-table">
          <thead>
            <tr>
              <th className="apoderados-table__th">Nombre</th>
              <th className="apoderados-table__th">Correo</th>
              <th className="apoderados-table__th">Teléfono</th>
              <th className="apoderados-table__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((_, index) => (
              <tr key={index} className="apoderados-table__row--data">
                <td className="apoderados-table__td" data-label="Nombre">
                  <div className="skeleton-block skeleton-name"></div>
                </td>
                <td className="apoderados-table__td" data-label="Email">
                  <div className="skeleton-block skeleton-email"></div>
                </td>
                <td className="apoderados-table__td" data-label="Teléfono">
                  <div className="skeleton-block skeleton-phone"></div>
                </td>
                <td className="apoderados-table__td" data-label="Acciones">
                  <div className="skeleton-button"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
};
