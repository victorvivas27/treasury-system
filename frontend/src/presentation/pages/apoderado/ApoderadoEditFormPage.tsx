import { EditarApoderadoForm } from "@/presentation/features/apoderado/EditarApoderadoForm";

import "./style/ApoderadoForm.css"


export const ApoderadoEditFormPage = () => {
  return (
    <main className="form-page-container">
      <header className="form-page-header">
        <h1 className="form-page-header__title">
          Modificar datos del apoderado
        </h1>
        <p className="form-page-header__subtitle">
          Revisa y cambia los campos que necesites actualizar
        </p>
      </header>

      <section className="form-container">
        <EditarApoderadoForm />
      </section>
    </main>
  );
};
