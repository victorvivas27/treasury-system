import { EditarAlumnoForm } from "@/presentation/features/alumno/EditarAlumnoForm";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";


export const AlumnoEditFormPage = () => {
  return (
    <main className="form-page-container">
      <header className="form-page-header">
        <h1 className="form-page-header__title">
          Modificar datos del alumno
        </h1>
        <p className="form-page-header__subtitle">
          Revisa y cambia los campos que necesites actualizar
        </p>
      </header>

      <section className="form-container">
        <EditarAlumnoForm />
      </section>
      <ButtonBack />
    </main>
  );
};
