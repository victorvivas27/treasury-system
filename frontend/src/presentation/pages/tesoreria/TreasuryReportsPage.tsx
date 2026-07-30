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
  const useCases = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);
  const load = async () => {
    setError("");
    try { setReports(await useCases.reports(year, type)); }
    catch { setReports([]); setError("No fue posible obtener el reporte."); }
  };
  return <main className="annual-fees-page">
    <header className="treasury-page__header">
      <p className="treasury-page__eyebrow">Tesorería</p><h1>Reportes</h1>
      <p>Consulta familias al día, con deuda y estados específicos de cuotas.</p>
    </header>
    <section className="treasury-panel">
      <div className="treasury-filters">
        <input type="number" value={year} onChange={event => setYear(Number(event.target.value))} />
        <select value={type} onChange={event => setType(event.target.value as TreasuryReportType)}>
          <option value="AL_DIA">Familias al día</option>
          <option value="DEUDA">Familias con deuda</option>
          <option value="ANUAL_PAGADA">Cuota única pagada</option>
          <option value="PRIMERA_PAGADA">Primera cuota pagada</option>
          <option value="SEGUNDA_PENDIENTE">Segunda cuota pendiente</option>
        </select>
        <Button label="Generar reporte" size="small" onClick={() => void load()} />
      </div>
      {error && <p className="treasury-error">{error}</p>}
      <div className="treasury-table-wrap"><table><thead><tr><th>Familia</th>
        <th>Alumno</th><th>Curso</th><th>Modalidad</th><th>Cuotas</th></tr></thead>
        <tbody>{reports.map(report => <tr key={report.familyId}><td>{report.familyCode}</td>
          <td>{report.studentName}</td><td>{report.course}</td><td>{report.mode}</td>
          <td>{report.obligations.map(item => `${item.concept}: ${item.status}`).join(" · ")}</td>
        </tr>)}</tbody></table></div>
    </section>
  </main>;
};
