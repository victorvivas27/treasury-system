import { BirthdaySection } from "@/presentation/features/alumno/BirthdaySection";
import { birthdayResource, useDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { LoadingState } from "@/shared/ui/loading/LoadingState";
import "./style/BirthdaysPage.css";

export const BirthdaysPage = () => {
  const { data: alumnos, error } = useDashboardResource(birthdayResource);
  const preparing = !alumnos && !error;

  return (
    <><main className="page-container birthdays-page" inert={preparing} aria-busy={preparing}>
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
      {alumnos && <BirthdaySection alumnos={alumnos} maxItems={0} />}
    </main>{preparing && <LoadingState message="Preparando los cumpleaños" />}</>
  );
};
