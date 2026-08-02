import { CrearAlumnoForm } from "@/presentation/features/alumno/CrearAlumnoForm";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";

export const AlumnoCrearFormPage = () => {
  return (
    <main className="form-page-container alumno-create-page">
      <header className="form-page-header">
        <h1 className="form-page-header__title">Nuevo alumno</h1>
        <p className="form-page-header__subtitle">
          Ingresa sus datos escolares para completar el registro.
        </p>
      </header>

      <section className="form-container">
        <CrearAlumnoForm />
      </section>
      <ButtonBack />
    </main>
  );
};
