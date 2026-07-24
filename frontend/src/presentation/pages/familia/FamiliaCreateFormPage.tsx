import { CrearFamilia } from "@/presentation/features/familia/CrearFamilia";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";

export const FamiliaCrearFormPage = () => {
  return (
    <main className="form-page-container">
      <header className="form-page-header">
        <h2 className="familia-create__title">Crear familia</h2>
        <p className="familia-create__subtitle">
          Vincula un alumno con uno o más apoderados.
        </p>
      </header>

      <section className="form-container">
        <CrearFamilia />
      </section>
      <ButtonBack />
    </main>
  );
};

