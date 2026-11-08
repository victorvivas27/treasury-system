import { usePageEntry } from '@/shared/ui/loading/PageTransition';
import { useCachedPageState } from '@/presentation/hooks/useCachedPageState';

import { useEffect, useState } from "react";
import type { TreasuryDashboard } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";

import "./AnnualFeesPage.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });
const SCHOOL_YEARS = Array.from({ length: 10 }, (_, index) => 2026 + index);

export const TreasuryOverviewPage = () => {
  const [year, setYear] = useCachedPageState('treasury-overview:year', 2026);
  const [dashboard, setDashboard] = useCachedPageState<TreasuryDashboard | null>(`treasury-overview:${year}:data`, null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  usePageEntry(loading && !dashboard, error);

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
      {loading && !dashboard ? null : <>
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
