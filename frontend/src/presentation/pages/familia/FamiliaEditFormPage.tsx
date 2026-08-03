import { EditarFamiliaForm } from "@/presentation/features/familia/EditarFamiliaForm";

export const FamiliaEditFormPage = () => {
  return (
    <main className="form-page-container familia-edit-page">
      <header className="form-page-header">
        <h1 className="form-page-header__title">
          Modificar datos de la familia
        </h1>
        <p className="form-page-header__subtitle">
          Revisa y cambia los campos que necesites actualizar
        </p>
      </header>

      <section className="form-container">
        <EditarFamiliaForm />
      </section>
    </main>
  );
};
