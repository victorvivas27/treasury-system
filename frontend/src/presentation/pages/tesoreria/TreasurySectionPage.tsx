import { Link } from "react-router-dom";
import "./TreasurySectionPage.css";

export type TreasurySection =
  | "Resumen"
  | "Cuotas"
  | "Pagos"
  | "Ingresos"
  | "Gastos"
  | "Eventos"
  | "Reportes";

interface TreasurySectionPageProps {
  section: TreasurySection;
}

export const TreasurySectionPage = ({ section }: TreasurySectionPageProps) => (
  <main className="treasury-page">
    <nav className="treasury-breadcrumb" aria-label="Miga de pan">
      <Link to="/dashboard">Dashboard</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{section}</span>
    </nav>

    <header className="treasury-page__header">
      <p className="treasury-page__eyebrow">Tesorería</p>
      <h1>{section}</h1>
      <p>Sección preparada para incorporar sus funcionalidades próximamente.</p>
    </header>

    <section className="treasury-page__content" aria-label={`Contenido de ${section}`}>
      <h2>{section}</h2>
      <p>Aquí se mostrará la información y las acciones de esta sección.</p>
    </section>
  </main>
);
