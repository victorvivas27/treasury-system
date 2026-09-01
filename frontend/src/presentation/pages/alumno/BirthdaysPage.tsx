import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { BirthdaySection } from "@/presentation/features/alumno/BirthdaySection";
import { Button } from "@/shared/ui/button/Button";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import { useCallback, useEffect, useState } from "react";
import "./style/BirthdaysPage.css";

const PAGE_SIZE = 100;

export const BirthdaysPage = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBirthdays = useCallback(async () => {
    const repository = new AlumnoRepositoryImpl();
    const collected: Alumno[] = [];
    let page = 0;
    let totalPages = 1;

    try {
      setLoading(true);
      setError("");

      while (page < totalPages) {
        const response = await repository.getAll(page, PAGE_SIZE);
        collected.push(...response.content);
        totalPages = response.totalPages || 1;
        page += 1;
      }

      setAlumnos(collected);
    } catch {
      setError("No fue posible cargar los cumpleaños.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBirthdays();
  }, [loadBirthdays]);

  return (
    <main className="page-container birthdays-page">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Cumpleaños</h1>
          <p className="page-header__subtitle">
            Revisa todos los cumpleaños registrados y los próximos del curso.
          </p>
        </div>

        <div className="page-header__actions mobile-inline-header-actions">
          <Button
            onClick={() => void loadBirthdays()}
            variant="secondary"
            size="medium"
            className="mobile-compact-header-action"
            icon={<ALUMNOS_ICONS.reload />}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando" : "Recargar"}
          />
        </div>
      </header>

      {error ? (
        <section className="birthdays-page__error">
          <p>{error}</p>
          <button type="button" onClick={() => void loadBirthdays()}>Reintentar</button>
        </section>
      ) : (
        <BirthdaySection alumnos={alumnos} loading={loading} maxItems={0} />
      )}
    </main>
  );
};
