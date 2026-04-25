import { CrearApoderadoForm } from "@/presentation/features/apoderado/CrearApoderadoForm";
import "./ApoderadoForm.css";



export const ApoderadoForm = () => {
  return (
  
    <main className="form-page-container">

      <header className="form-page-header">

        <h1 className="form-page-header__title">Nuevo Apoderado</h1>
          <p className="form-page-header__subtitle">
            Completa la información para registrar un nuevo apoderado en el sistema.
          </p>

      </header>

      <section className="form-container">
        <CrearApoderadoForm />
      </section>

    </main>
  );
};
