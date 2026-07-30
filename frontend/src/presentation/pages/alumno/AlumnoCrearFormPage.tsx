import { CrearAlumnoForm } from "@/presentation/features/alumno/CrearAlumnoForm";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";

export const AlumnoCrearFormPage = () => {
  return (
    <main className="form-page-container">
      <header className="form-page-header">
        <h1 className="form-page-header__title">Nuevo Alumno</h1>
        <p className="form-page-header__subtitle">
          Completa la información para registrar un nuevo alumno en el sistema.
        </p>
      </header>

      <section className="form-container">
        <CrearAlumnoForm />
      </section>
      <ButtonBack />
    </main>
  );
};
