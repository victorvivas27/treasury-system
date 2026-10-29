import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
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
  const [catalog, setCatalog] = useState<ArchitectureCatalog>();
  const [selected, setSelected] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    architectureUseCases.catalog(controller.signal).then(
      value => {
        if (!controller.signal.aborted) {
          setCatalog(value);
          setSelected(current => current || value.diagrams[0]?.id || "");
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
    setDocument("");
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
  return (
    <section className="architecture-page">
      <header>
        <p className="architecture-eyebrow">Administración · Acceso del dueño</p>
        <h1>Arquitectura del sistema</h1>
        <p>Módulo 1 · {catalog?.title ?? "Autenticación, usuarios y seguridad"}</p>
        {catalog && <small>Referencia {catalog.revision.slice(0, 8)} · {catalog.generatedAt}</small>}
      </header>
      <div className="architecture-diagrams" aria-label="Vistas del módulo 1">
        {catalog?.diagrams.map(diagram => (
          <button type="button" key={diagram.id} aria-pressed={selected === diagram.id}
            onClick={() => setSelected(diagram.id)}>
            <strong>{diagram.title}</strong><span>{diagram.description}</span>
          </button>
        ))}
      </div>
      {error ? <FeedbackState message={error} actionText="Reintentar"
        onRefresh={() => setAttempt(value => value + 1)} /> : loading ? <div role="status" aria-label="Cargando gráfico"><Skeleton height="16rem" /></div> : (
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
      <p className="architecture-help">Siguiente módulo: organizaciones y cursos, pendiente de documentación.</p>
    </section>
  );
};
