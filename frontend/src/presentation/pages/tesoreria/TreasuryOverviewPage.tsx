import { useEffect, useState } from "react";
import type { TreasuryDashboard } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./AnnualFeesPage.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });
const SCHOOL_YEARS = Array.from({ length: 10 }, (_, index) => 2026 + index);

export const TreasuryOverviewPage = () => {
  const [year, setYear] = useState(2026);
  const [dashboard, setDashboard] = useState<TreasuryDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const repository = new TreasuryRepositoryImpl();
    setLoading(true);
    setError("");
    repository.dashboard(year)
      .then(setDashboard)
      .catch(() => {
        setDashboard(null);
        setError("No hay un resumen configurado para el año seleccionado.");
      })
      .finally(() => setLoading(false));
  }, [year]);

  return <main className="annual-fees-page">
    <header className="treasury-page__header">
      <p className="treasury-page__eyebrow">Tesorería</p>
      <h1>Resumen {year}</h1>
      <p>Estado general de la cuota anual y su recaudación.</p>
      <label className="treasury-year-selector">
        <span>Año escolar</span>
        <select value={year}
          onChange={event => setYear(Number(event.target.value))}>
          {SCHOOL_YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </label>
    </header>
    <section className="treasury-dashboard" aria-label="Dashboard de tesorería">
      {loading ? ["Total familias", "Cuota única", "Dos cuotas", "Cuotas pagadas",
        "Cuotas pendientes", "Monto recaudado", "Monto pendiente"].map(label =>
        <article className="treasury-dashboard-skeleton" key={label} aria-hidden="true">
          <span>{label}</span><div className="skeleton-block" />
        </article>) : <>
        <article><span>Total familias</span><strong>{dashboard?.totalFamilies ?? 0}</strong></article>
        <article><span>Cuota única</span><strong>{dashboard?.annualFamilies ?? 0}</strong></article>
        <article><span>Dos cuotas</span><strong>{dashboard?.twoInstallmentFamilies ?? 0}</strong></article>
        <article><span>Cuotas pagadas</span><strong>{dashboard?.paidObligations ?? 0}</strong></article>
        <article><span>Cuotas pendientes</span><strong>{dashboard?.pendingObligations ?? 0}</strong></article>
        <article><span>Monto recaudado</span><strong>{money.format(dashboard?.collectedAmount ?? 0)}</strong></article>
        <article><span>Monto pendiente</span><strong>{money.format(dashboard?.pendingAmount ?? 0)}</strong></article>
      </>}
    </section>
    {error && <p className="treasury-error">{error}</p>}
  </main>;
};
