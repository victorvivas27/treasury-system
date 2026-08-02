import { useMemo, useState } from "react";
import type { TreasuryReport, TreasuryReportType }
  from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import "./AnnualFeesPage.css";

export const TreasuryReportsPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<TreasuryReportType>("DEUDA");
  const [reports, setReports] = useState<TreasuryReport[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const useCases = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);
  const load = async () => {
    setError("");
    setLoading(true);
    setHasGenerated(true);
    try { setReports(await useCases.reports(year, type)); }
    catch { setReports([]); setError("No fue posible obtener el reporte."); }
    finally { setLoading(false); }
  };
  return <main className="annual-fees-page treasury-reports-page">
    <header className="treasury-page__header">
      <p className="treasury-page__eyebrow">Tesorería</p><h1>Reportes</h1>
      <p>Consulta familias al día, con deuda y estados específicos de cuotas.</p>
    </header>
    <section className="treasury-panel">
      <div className="treasury-filters">
        <input type="number" value={year} onChange={event => {
          setYear(Number(event.target.value));
          setHasGenerated(false);
        }} />
        <select value={type} onChange={event => {
          setType(event.target.value as TreasuryReportType);
          setHasGenerated(false);
        }}>
          <option value="AL_DIA">Familias al día</option>
          <option value="DEUDA">Familias con deuda</option>
          <option value="ANUAL_PAGADA">Cuota única pagada</option>
          <option value="PRIMERA_PAGADA">Primera cuota pagada</option>
          <option value="SEGUNDA_PENDIENTE">Segunda cuota pendiente</option>
        </select>
        <div className="treasury-report-filter-actions">
          <Button label={loading ? "Generando..." : "Generar reporte"} size="small"
            loading={loading} onClick={() => void load()} />
          <Button label="Limpiar" size="small" variant="secondary"
            disabled={!hasGenerated && !error} onClick={() => {
              setReports([]);
              setError("");
              setHasGenerated(false);
            }} />
        </div>
      </div>
      {hasGenerated && <section className="treasury-report-results" aria-live="polite">
        <header><h2>Resultados del reporte</h2>
          {!loading && !error && <span>{reports.length} {reports.length === 1 ? "familia" : "familias"}</span>}
        </header>
        {error && <p className="treasury-error">{error}</p>}
        {!loading && !error && reports.length === 0 &&
          <p className="treasury-report-empty">No se encontraron resultados para los filtros seleccionados.</p>}
      {reports.length > 0 && <div className="treasury-table-wrap"><table className="treasury-reports-table"><thead><tr><th>Apoderado principal</th>
        <th>Alumno</th><th>Curso</th><th>Modalidad</th><th>Cuotas</th></tr></thead>
        <tbody>{reports.map(report => <tr key={report.familyId}>
          <td data-label="Apoderado principal">{report.primaryGuardian || "Sin apoderado principal"}</td>
          <td data-label="Alumno">{report.studentName}</td>
          <td data-label="Curso">{report.course}</td>
          <td data-label="Modalidad">{report.mode}</td>
          <td data-label="Cuotas"><div className="treasury-report-fees">
            {report.obligations.map(item => <span className="treasury-report-fee" key={item.id}>
              <span>{item.concept}:</span>
              <strong className={`fee-status fee-status--${item.status.toLowerCase()}`}>
                {item.status}
              </strong>
            </span>)}
          </div></td>
        </tr>)}</tbody></table></div>}
      </section>}
    </section>
  </main>;
};
