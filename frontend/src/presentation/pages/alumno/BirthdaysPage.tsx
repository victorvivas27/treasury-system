import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { BirthdaySection } from "@/presentation/features/alumno/BirthdaySection";
import { useCallback, useEffect, useState } from "react";
import "./style/BirthdaysPage.css";

export const BirthdaysPage = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBirthdays = useCallback(async () => {
    const repository = new AlumnoRepositoryImpl();

    try {
      setLoading(true);
      setError("");

      setAlumnos(await repository.getBirthdays());
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
          <h1 className="page-header__title">{"Cumplea\u00f1os"}</h1>
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
