import { usePageEntry } from '@/shared/ui/loading/PageTransition';
import { useCachedPageState } from '@/presentation/hooks/useCachedPageState';

import { useEffect, useState } from "react";
import type { ArchitectureCatalog } from "@/core/A-domain/entities/architecture/Architecture";
import { architectureUseCases } from "@/presentation/hooks/architecture/useArchitectureAccess";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { Button } from "@/shared/ui/button/Button";
import "./ArchitecturePage.css";

// Opaque iframe origin: diagram scripts cannot read the application's session or DOM.
const isolateDiagram = (html: string) => html.replace(/<head(?:\s[^>]*)?>/i, head => `${head}
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <meta name="referrer" content="no-referrer">`);

export const ArchitecturePage = () => {
  const [catalog, setCatalog] = useCachedPageState<ArchitectureCatalog | undefined>('architecture:catalog', undefined);
  const [selected, setSelected] = useCachedPageState('architecture:selected', "");
  const [document, setDocument] = useCachedPageState(`architecture:document:${selected}`, "");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [fetching, setLoading] = useState(true);
  const loading = fetching && !document;
  usePageEntry(loading, error);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    architectureUseCases.catalog(controller.signal).then(
      value => {
        if (!controller.signal.aborted) {
          setCatalog(value);
          setSelected(current => value.diagrams.some(diagram => diagram.id === current)
            ? current : value.diagrams[0]?.id || "");
          if (!value.diagrams.length) setLoading(false);
        }
      },
      () => {
        if (!controller.signal.aborted) { setError("No se pudo cargar la arquitectura."); setLoading(false); }
      },
    );
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    architectureUseCases.diagram(selected, controller.signal).then(
      html => {
        if (!controller.signal.aborted) { setDocument(isolateDiagram(html)); setLoading(false); }
      },
      () => {
        if (!controller.signal.aborted) { setError("No se pudo cargar el gráfico. Comprueba tu sesión y acceso."); setLoading(false); }
      },
    );
    return () => controller.abort();
  }, [selected, attempt]);

  const active = catalog?.diagrams.find(diagram => diagram.id === selected);
  const moduleId = active?.moduleId ?? catalog?.moduleId;
  const modules = [...new Map(catalog?.diagrams.map(diagram => [diagram.moduleId ?? catalog.moduleId, {
    id: diagram.moduleId ?? catalog.moduleId,
    title: diagram.moduleTitle ?? `Módulo 1 · ${catalog.title}`,
  }])).values()];
  return (
    <section className="architecture-page">
      <header>
        <p className="architecture-eyebrow">Administración · Acceso del dueño</p>
        <h1>Arquitectura del sistema</h1>
        <p>{active?.moduleTitle ?? `Módulo 1 · ${catalog?.title ?? "Autenticación, usuarios y seguridad"}`}</p>
        {catalog && <small>Referencia {(active?.revision ?? catalog.revision).slice(0, 8)} · {active?.generatedAt ?? catalog.generatedAt}</small>}
      </header>
      {modules.length > 1 && <div className="architecture-module-select">
        <label htmlFor="architecture-module">Módulo</label>
        <select id="architecture-module" value={moduleId} onChange={event => {
          const first = catalog?.diagrams.find(diagram => (diagram.moduleId ?? catalog.moduleId) === event.target.value);
          if (first) setSelected(first.id);
        }}>
          {modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}
        </select>
      </div>}
      <div className="architecture-diagrams" aria-label="Vistas de arquitectura">
        {catalog?.diagrams.filter(diagram => (diagram.moduleId ?? catalog.moduleId) === moduleId).map(diagram => (
          <button type="button" key={diagram.id} aria-pressed={selected === diagram.id}
            onClick={() => setSelected(diagram.id)}>
            <strong>{diagram.title}</strong><span>{diagram.description}</span>
          </button>
        ))}
      </div>
      {error ? <FeedbackState message={error} actionText="Reintentar"
        onRefresh={() => setAttempt(value => value + 1)} /> : loading ? null : (
        <div className="architecture-viewer">
          <div className="architecture-viewer-heading">
            <h2>{active?.title}</h2>
            <Button label="Ampliar gráfico" variant="secondary" size="small"
              onClick={() => {
                const frame = window.document.getElementById("architecture-frame");
                if (frame?.requestFullscreen) void frame.requestFullscreen().catch(() => {});
              }} />
          </div>
          <iframe id="architecture-frame" title={`Gráfico: ${active?.title ?? "Arquitectura"}`}
            srcDoc={document} sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
            allow="fullscreen" referrerPolicy="no-referrer" />
        </div>
      )}
      <p className="architecture-help">Selecciona un componente o su indicador SRC para consultar las fuentes.
        Puedes buscar, ajustar el zoom y cambiar el tema. Las notas están debajo del gráfico;
        algunos controles están en inglés.</p>
      {moduleId === "12-operations" && <p className="architecture-help">Los gráficos describen el commit de referencia; no consultan ejecuciones de GitHub en tiempo real.</p>}
      <p className="architecture-help">Siguiente módulo: organizaciones y cursos, pendiente de documentación.</p>
    </section>
  );
};
