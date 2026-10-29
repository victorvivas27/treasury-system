import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { useEffect, useState } from "react";
import type { CoverageMetric, QualityReport, QualityReportCatalog } from "@/core/A-domain/entities/quality/QualityReport";
import { QualityReportUseCases } from "@/core/B-application/use-cases/quality/QualityReportUseCases";
import { QualityReportRepositoryImpl } from "@/core/C-infra/repositories/quality/QualityReportRepositoryImpl";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { Button } from "@/shared/ui/button/Button";
import "./QualityReportsPage.css";

export const qualityReportUseCases = new QualityReportUseCases(new QualityReportRepositoryImpl());
const coverageMetricLabels: Record<string, string> = {
  lines: "Líneas",
  branches: "Ramas",
  functions: "Funciones",
  methods: "Métodos",
};
const coverageMetricOrder = ["lines", "branches", "functions", "methods"];
const coverageNumber = new Intl.NumberFormat("es-CL");

const CoverageChart = ({ report }: { report: QualityReport }) => {
  const metrics = coverageMetricOrder.flatMap(key => {
    const metric = report.coverage[key];
    return metric && Number.isFinite(metric.percent) && Number.isFinite(metric.covered) &&
      Number.isFinite(metric.total) && metric.total > 0 ? [[key, metric] as [string, CoverageMetric]] : [];
  });

  return <section className="quality-coverage" aria-label={`Cobertura de código ${report.application}`}>
    <h3>Cobertura de código</h3>
    {metrics.length ? <>
      <div className="quality-coverage__scale" aria-hidden="true"><span>0 %</span><span>100 %</span></div>
      <ul className="quality-coverage__metrics">
        {metrics.map(([key, metric]) => {
          const percent = Math.min(100, Math.max(0, metric.percent));
          const label = coverageMetricLabels[key];
          return <li key={key}>
            <div className="quality-coverage__label"><span>{label}</span><strong>{metric.percent.toFixed(2)} %</strong></div>
            <div className="quality-coverage__track" role="progressbar" aria-label={`Cobertura de ${label}`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>{coverageNumber.format(metric.covered)} de {coverageNumber.format(metric.total)} cubiertos</small>
          </li>;
        })}
      </ul>
    </> : <p className="quality-coverage__empty">No hay métricas de cobertura disponibles.</p>}
  </section>;
};

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
      <p>La cobertura de código se muestra abajo; el reporte Allure detalla los resultados de las pruebas.</p></header>
    {error && <FeedbackState message={error} actionText="Reintentar" onRefresh={() => setAttempt(value => value + 1)} />}
    {loading && !html && <div className="quality-report-list" role="status" aria-label="Cargando reporte"><article><h2><Skeleton /></h2><p><Skeleton /></p><Skeleton height="10rem" /></article></div>}
    {catalog && !catalog.reports.length && !error && <p role="status">{catalog.configured
      ? "Todavía no hay reportes publicados." : "Los reportes estarán disponibles cuando se configure su almacenamiento privado."}</p>}
    {!!catalog?.reports.length && <div className="quality-report-list" aria-label="Reportes disponibles">
      {catalog.reports.map(report => <article key={report.id}>
        <div className="quality-report-card__header">
          <div><h2>{report.application === "frontend" ? "Frontend" : "Backend"} · {report.suite === "combined" ? "Suite completa" : report.suite}</h2>
            <p><time dateTime={report.generatedAt}>{new Date(report.generatedAt).toLocaleString("es-CL")}</time></p>
            <p>{report.tests.passed}/{report.tests.total} pruebas aprobadas</p>
            <small>Revisión {report.sha.slice(0, 8)}</small></div>
          <Button label="Abrir reporte" ariaLabel={`Abrir reporte ${report.application} ${report.id}`}
            variant={selected === report.id ? "primary" : "secondary"} size="small" onClick={() => setSelected(report.id)} />
        </div>
        <CoverageChart report={report} />
      </article>)}
    </div>}
    {html && active && <div className="quality-report-viewer">
      <div><h2>Allure · {active.application}</h2><Button label="Ampliar" size="small" variant="secondary"
        onClick={() => { void document.getElementById("quality-report-frame")?.requestFullscreen?.().catch(() => {}); }} /></div>
      <iframe id="quality-report-frame" title={`Allure ${active.application}`} srcDoc={html}
        sandbox="allow-scripts allow-downloads" allow="fullscreen" referrerPolicy="no-referrer" />
    </div>}
    <p className="quality-report-note">La cobertura mide código ejecutado; el porcentaje de pruebas aprobadas es otra métrica.
      Las coberturas de distintas ejecuciones no se suman.</p>
  </section>;
};
