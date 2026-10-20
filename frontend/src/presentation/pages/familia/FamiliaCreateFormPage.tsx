import { CrearFamilia } from "@/presentation/features/familia/CrearFamilia";
import "./style/FamiliaFormMobile.css";

export const FamiliaCrearFormPage = () => {
  return (
    <main className="form-page-container familia-create-page">
      <header className="form-page-header">
        <h1 className="familia-create__title">Crear familia</h1>
        <p className="familia-create__subtitle">
          Vincula un alumno con uno o más apoderados.
        </p>
      </header>

      <section className="form-container">
        <CrearFamilia />
      </section>
    </main>
  );
};

