import { useEffect, useState } from "react";
import type { QualityReportCatalog } from "@/core/A-domain/entities/quality/QualityReport";
import { QualityReportUseCases } from "@/core/B-application/use-cases/quality/QualityReportUseCases";
import { QualityReportRepositoryImpl } from "@/core/C-infra/repositories/quality/QualityReportRepositoryImpl";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { Button } from "@/shared/ui/button/Button";
import "./QualityReportsPage.css";

export const qualityReportUseCases = new QualityReportUseCases(new QualityReportRepositoryImpl());
// No same-origin, network, forms or popups: report code cannot read the app session.
const isolate = (html: string) => html
  // Allure 3.22.1 builds a base URL from location.origin, which is "null" in srcdoc.
  .replace('new URL(pathname, origin)', 'new URL("/", "https://allure.invalid")')
  .replace(/<head(?:\s[^>]*)?>/i, head => `${head}
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline' blob:; img-src data: blob:; font-src data: blob:; connect-src blob: data:; worker-src blob:; object-src 'none'; base-uri https://allure.invalid; form-action 'none'">
<base href="https://allure.invalid/"><meta name="referrer" content="no-referrer">
<style>*{scrollbar-width:none}*::-webkit-scrollbar{display:none}</style>
<script>for(const name of ['localStorage','sessionStorage']){const values=new Map();Object.defineProperty(window,name,{value:{getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size}}});}</script>`);

export const QualityReportsPage = () => {
  const [catalog, setCatalog] = useState<QualityReportCatalog>();
  const [selected, setSelected] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setHtml(""); setSelected(""); setCatalog(undefined);
    qualityReportUseCases.catalog(controller.signal).then(value => {
      if (!controller.signal.aborted) { setCatalog(value); setLoading(false); }
    }, () => {
      if (!controller.signal.aborted) { setError("No se pudieron cargar los reportes. Comprueba tu sesión y acceso."); setLoading(false); }
    });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setHtml(""); setError(""); setLoading(true);
    qualityReportUseCases.content(selected, controller.signal).then(value => {
      if (!controller.signal.aborted) { setHtml(isolate(value)); setLoading(false); }
    }, () => {
      if (!controller.signal.aborted) { setError("El reporte no está disponible o tu acceso cambió."); setLoading(false); }
    });
    return () => controller.abort();
  }, [selected]);
  const active = catalog?.reports.find(report => report.id === selected);
  return <section className="quality-reports-page">
    <header><p>Administración</p><h1>Reportes de calidad</h1>
      <p>Resultados de pruebas y cobertura de código por ejecución.</p></header>
    {error && <FeedbackState message={error} actionText="Reintentar" onRefresh={() => setAttempt(value => value + 1)} />}
    {loading && <p role="status">Cargando reporte…</p>}
    {catalog && !catalog.reports.length && !error && <p role="status">{catalog.configured
      ? "Todavía no hay reportes publicados." : "Los reportes estarán disponibles cuando se configure su almacenamiento privado."}</p>}
    {!!catalog?.reports.length && <div className="quality-report-list" aria-label="Reportes disponibles">
      {catalog.reports.map(report => <article key={report.id}>
        <div><h2>{report.application === "frontend" ? "Frontend" : "Backend"} · {report.suite === "combined" ? "Suite completa" : report.suite}</h2>
          <p><time dateTime={report.generatedAt}>{new Date(report.generatedAt).toLocaleString("es-CL")}</time></p>
          <p>{report.tests.passed}/{report.tests.total} pruebas aprobadas · Líneas: {report.coverage.lines?.percent.toFixed(2) ?? "—"} %</p>
          <small>Revisión {report.sha.slice(0, 8)}</small></div>
        <Button label="Abrir reporte" ariaLabel={`Abrir reporte ${report.application} ${report.id}`}
          variant={selected === report.id ? "primary" : "secondary"} size="small" onClick={() => setSelected(report.id)} />
      </article>)}
    </div>}
    {html && active && <div className="quality-report-viewer">
      <div><h2>Allure · {active.application}</h2><Button label="Ampliar" size="small" variant="secondary"
        onClick={() => { void document.getElementById("quality-report-frame")?.requestFullscreen?.().catch(() => {}); }} /></div>
      <iframe id="quality-report-frame" title={`Allure ${active.application}`} srcDoc={html}
        sandbox="allow-scripts allow-downloads" allow="fullscreen" referrerPolicy="no-referrer" />
    </div>}
    <p className="quality-report-note">La cobertura mide código ejecutado; el porcentaje de éxito de Allure mide pruebas aprobadas.
      Las coberturas de distintas suites no se suman.</p>
  </section>;
};
