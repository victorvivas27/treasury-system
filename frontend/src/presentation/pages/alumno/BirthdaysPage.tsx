import { BirthdaySection } from "@/presentation/features/alumno/BirthdaySection";
import { birthdayResource, useDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import "./style/BirthdaysPage.css";

export const BirthdaysPage = () => {
  const { data: alumnos, error } = useDashboardResource(birthdayResource);
  const preparing = !alumnos && !error;

  return (
    <><main className="page-container birthdays-page" aria-busy={preparing}>
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">{"Cumplea\u00f1os"}</h1>
        </div>

      </header>

      {error && (
        <section className="birthdays-page__error" role="alert">
          <p>No fue posible actualizar los cumpleaños.</p>
          <button type="button" onClick={() => void birthdayResource.load(true)}>Reintentar</button>
        </section>
      )}
      {preparing && <section className="birthday-section" role="status" aria-label="Cargando cumpleaños" aria-busy="true">
        <header className="birthday-section__header"><h2>Próximos cumpleaños</h2></header>
        <div className="birthday-section__grid">{Array.from({ length: 4 }, (_, index) => <article className="birthday-card" key={index}>
          <div className="birthday-card__body"><h3><Skeleton /></h3><p><Skeleton width="60%" /></p></div>
          <strong><Skeleton width="10ch" /></strong>
        </article>)}</div>
      </section>}
      {alumnos && <BirthdaySection alumnos={alumnos} maxItems={0} />}
    </main></>
  );
};
