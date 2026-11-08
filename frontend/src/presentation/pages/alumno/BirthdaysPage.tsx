import { usePageEntry } from '@/shared/ui/loading/PageTransition';
import { ActionButton } from '@/shared/ui/button/ActionButton';
import { BirthdaySection } from "@/presentation/features/alumno/BirthdaySection";
import { birthdayResource, useDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";

import "./style/BirthdaysPage.css";

export const BirthdaysPage = () => {
  const { data: alumnos, error } = useDashboardResource(birthdayResource);
  const preparing = !alumnos && !error;
  usePageEntry(preparing);

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
          <ActionButton type="button" onClick={() => birthdayResource.load(true)}>Reintentar</ActionButton>
        </section>
      )}

      {alumnos && <BirthdaySection alumnos={alumnos} maxItems={0} />}
    </main></>
  );
};
