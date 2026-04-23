import { ApoderadosList } from "@/presentation/features/apoderado/ApoderadosList";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import type { FC } from "react";
import "./ApoderadoPage.css";
import { Button } from "@/shared/ui/button/Button";
import { APODERADOS_ICONS } from "@/shared/constants/Icons";



export const ApoderadoPage: FC = () => {
  const { apoderados, loading, error, refetch } = useApoderados();

  return (
    <main className="page-container">
      <header className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Gestión de Apoderados</h1>
          <p className="page-header__subtitle">
            Visualiza y administra la información de contacto de los padres y apoderados.
          </p>
        </div>

        <div className="page-header__actions">
          <Button
            onClick={refetch}
            variant="secondary"
            size="medium"
            icon={<APODERADOS_ICONS.reload />}
            iconPosition="left"
            loading={loading}
            label={loading ? "Cargando..." : undefined}
          />
        </div>
      </header>

      <section className="page-content">
        <ApoderadosList
          apoderados={apoderados}
          loading={loading}
          error={error}
          onRefresh={refetch}
        />
      </section>
    </main>
  );
};
