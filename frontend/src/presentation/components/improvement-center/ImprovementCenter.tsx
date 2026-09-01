import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { FiCheckCircle, FiImage, FiList, FiX } from "react-icons/fi";
import { IoBulbOutline } from "react-icons/io5";
import type { ImprovementCategory, ImprovementSuggestion, UserImpact } from
  "@/core/A-domain/entities/improvement/ImprovementSuggestion";
import { ImprovementSuggestionUseCases } from
  "@/core/B-application/use-cases/improvement/ImprovementSuggestionUseCases";
import { ImprovementSuggestionRepositoryImpl } from
  "@/core/C-infra/repositories/improvement/ImprovementSuggestionRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { OPEN_IMPROVEMENT_CENTER_EVENT } from "@/presentation/context/improvement/ImprovementCenterEvents";
import "./ImprovementCenter.css";

const categories: Array<{ value: ImprovementCategory; label: string; items: string[] }> = [
  { value: "PAYMENTS", label: "Perfil de pagos", items: ["Entender el estado de pago", "Ver cuotas pendientes", "Ver pagos confirmados", "Mejorar avisos de pago"] },
  { value: "STUDENTS", label: "Alumno asociado", items: ["Ver a qué alumno corresponde", "Entender vínculos familiares", "Ver información del curso", "Identificar al apoderado responsable"] },
  { value: "REPORTS", label: "Historial y comprobantes", items: ["Ver comprobantes con claridad", "Ver historial con más detalle", "Descargar información", "Filtrar por fecha o estado"] },
  { value: "UX", label: "Claridad de la pantalla", items: ["Textos más claros", "Simplificar esta pantalla", "Mejorar visualización móvil", "Encontrar información más fácil"] },
  { value: "PERFORMANCE", label: "Rapidez al revisar pagos", items: ["Carga más rápida", "Menos esperas", "Evitar recargas innecesarias", "Mejorar apertura de comprobantes"] },
  { value: "COURSES_ADMIN", label: "Cobros del curso", items: ["Entender qué se está cobrando", "Ver fechas de vencimiento", "Distinguir cuotas y aportes", "Mejorar avisos del curso"] },
  { value: "OTHER", label: "Otra", items: ["Tengo otra idea", "Otro"] },
];

const impacts: Array<{ value: UserImpact; title: string; description: string }> = [
  { value: "USEFUL", title: "Me ayudaría", description: "Haría más clara o cómoda la información que reviso." },
  { value: "DIFFICULT", title: "Me cuesta entenderlo", description: "Me obliga a buscar mucho o preguntar por fuera." },
  { value: "BLOCKING", title: "No puedo avanzar", description: "Me impide revisar o completar una consulta importante." },
];

const statusLabel: Record<string, string> = {
  RECEIVED: "Recibida",
  UNDER_REVIEW: "En revisión",
  PLANNED: "Planificada",
  IMPLEMENTED: "Implementada",
  REJECTED: "Descartada",
};

const categoryLabel = (value: ImprovementCategory) =>
  categories.find(category => category.value === value)?.label ?? "Otra";

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const repository = new ImprovementSuggestionRepositoryImpl();
const useCases = new ImprovementSuggestionUseCases(repository);

export const ImprovementCenter = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [category, setCategory] = useState<ImprovementCategory | "">("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<UserImpact>("USEFUL");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotInputKey, setScreenshotInputKey] = useState(0);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState("");
  const [screenshotPreviewLoading, setScreenshotPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [detail, setDetail] = useState<ImprovementSuggestion | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const quickItems = useMemo(() =>
    categories.find(item => item.value === category)?.items ?? [], [category]);

  useEffect(() => {
    const openCenter = () => {
      setOpen(true);
      setTab("new");
    };
    window.addEventListener(OPEN_IMPROVEMENT_CENTER_EVENT, openCenter);
    return () => window.removeEventListener(OPEN_IMPROVEMENT_CENTER_EVENT, openCenter);
  }, []);

  useEffect(() => {
    if (!open || tab !== "mine") return;
    setLoadingMine(true);
    void useCases.mine()
      .then(setSuggestions)
      .catch(() => setError("No fue posible cargar tus sugerencias."))
      .finally(() => setLoadingMine(false));
  }, [open, tab]);

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreviewUrl("");
      setScreenshotPreviewLoading(false);
      return;
    }
    const previewUrl = URL.createObjectURL(screenshot);
    setScreenshotPreviewUrl(previewUrl);
    setScreenshotPreviewLoading(true);
    return () => URL.revokeObjectURL(previewUrl);
  }, [screenshot]);

  const resetForm = () => {
    setCategory("");
    setSelectedItems([]);
    setTitle("");
    setDescription("");
    setImpact("USEFUL");
    setScreenshot(null);
    setScreenshotInputKey(current => current + 1);
  };

  const toggleItem = (item: string) => setSelectedItems(current =>
    current.includes(item) ? current.filter(value => value !== item) : [...current, item]);

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("La captura debe ser JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("La captura debe pesar hasta 3 MB.");
      event.target.value = "";
      return;
    }
    setScreenshot(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotInputKey(current => current + 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!category) {
      setError("Selecciona una categoría.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Completa el título y la descripción.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await useCases.create({
        category,
        selectedItems,
        title: title.trim(),
        description: description.trim(),
        userImpact: impact,
        sourceRoute: `${location.pathname}${location.search}`,
        screenshot,
      });
      resetForm();
      setSuggestions(current => [created, ...current]);
      setSuccess(`Gracias. Tu sugerencia #${created.id} fue enviada correctamente.`);
      setTab("mine");
    } catch {
      setError("No fue posible enviar la sugerencia. Revisa los datos e intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return <ModalAlert isOpen={Boolean(success)} type="success" message={success}
    variant="toast" autoCloseTime={2800} onClose={() => setSuccess("")} />;

  return <>
    <aside className="improvement-center" role="dialog" aria-modal="true"
      aria-labelledby="improvement-center-title" onClick={() => !submitting && setOpen(false)}>
      <section className="improvement-center__panel" onClick={event => event.stopPropagation()}>
        <header className="improvement-center__header">
          <span aria-hidden="true"><IoBulbOutline /></span>
          <div><h2 id="improvement-center-title">Centro de Mejoras</h2>
            <p>Comparte una idea sobre tu perfil de pagos y lo que necesitas revisar.</p></div>
          <button type="button" aria-label="Cerrar Centro de Mejoras" onClick={() => setOpen(false)}>
            <FiX aria-hidden="true" />
          </button>
        </header>
        <nav className="improvement-center__tabs" aria-label="Centro de Mejoras">
          <button type="button" className={tab === "new" ? "is-active" : ""}
            onClick={() => setTab("new")}><IoBulbOutline /> Nueva sugerencia</button>
          <button type="button" className={tab === "mine" ? "is-active" : ""}
            onClick={() => setTab("mine")}><FiList /> Mis sugerencias</button>
        </nav>
        {error && <p className="improvement-center__error">{error}</p>}
        {tab === "new" ? <form className="improvement-center__form" onSubmit={submit}>
          <section><h3>Categoría</h3>
            <div className="improvement-center__choices">
              {categories.map(item => <button key={item.value} type="button"
                className={category === item.value ? "is-selected" : ""}
                onClick={() => { setCategory(item.value); setSelectedItems([]); }}>
                {item.label}
              </button>)}
            </div></section>
          {category && <section><h3>Opciones rápidas</h3>
            <div className="improvement-center__quick">
              {[...quickItems, "Tengo otra idea"].filter((item, index, self) => self.indexOf(item) === index)
                .map(item => <label key={item}>
                  <input type="checkbox" checked={selectedItems.includes(item)}
                    onChange={() => toggleItem(item)} />{item}
                </label>)}
            </div></section>}
          <section className="improvement-center__fields"><h3>Información</h3>
            <label htmlFor="improvement-title">Resume tu sugerencia</label>
            <input id="improvement-title" maxLength={120} value={title}
              placeholder="Ej: Ver más claro cuáles cuotas están pendientes"
              onChange={event => setTitle(event.target.value)} required />
            <label htmlFor="improvement-description">Cuéntanos qué necesitas ver o entender mejor</label>
            <textarea id="improvement-description" maxLength={2000} value={description}
              onChange={event => setDescription(event.target.value)} required rows={4} />
          </section>
          <section><h3>Impacto</h3>
            <div className="improvement-center__impact">
              {impacts.map(item => <button key={item.value} type="button"
                className={impact === item.value ? "is-selected" : ""}
                onClick={() => setImpact(item.value)}>
                <strong>{item.title}</strong><span>{item.description}</span>
              </button>)}
            </div></section>
          <section className="improvement-center__upload">
            <label htmlFor="improvement-screenshot"><FiImage /> Captura opcional</label>
            <input key={screenshotInputKey} id="improvement-screenshot" type="file"
              accept="image/png,image/jpeg,image/webp" onChange={pickFile} />
            {screenshot && <article className="improvement-center__upload-preview" aria-live="polite">
              <div className="improvement-center__upload-thumb">
                {screenshotPreviewLoading && <span className="improvement-center__upload-loader"
                  aria-label="Preparando captura" />}
                {screenshotPreviewUrl && <img src={screenshotPreviewUrl} alt=""
                  onLoad={() => setScreenshotPreviewLoading(false)}
                  onError={() => setScreenshotPreviewLoading(false)} />}
              </div>
              <div>
                <strong>{screenshotPreviewLoading ? "Preparando captura..." : "Captura lista"}</strong>
                <small>{screenshot.name} · {formatFileSize(screenshot.size)}</small>
              </div>
              <button type="button" onClick={removeScreenshot} disabled={submitting}>
                Quitar
              </button>
            </article>}
          </section>
          <footer>
            <Button label="Cancelar" variant="secondary" onClick={() => setOpen(false)} />
            <Button label="Enviar sugerencia" type="submit" loading={submitting}
              disabled={submitting} onClick={() => undefined} icon={<FiCheckCircle />} />
          </footer>
        </form> : <section className="improvement-center__mine">
          {loadingMine && <p>Cargando tus sugerencias...</p>}
          {!loadingMine && suggestions.length === 0 && <p>Aún no has enviado sugerencias.</p>}
          {suggestions.map(item => <article key={item.id}>
            <button type="button" onClick={() => setDetail(detail?.id === item.id ? null : item)}>
              <span><strong>#{item.id} {item.title}</strong>
                <small>{categoryLabel(item.category)} · {new Date(item.createdAt).toLocaleDateString("es-CL")}</small></span>
              <em className={`improvement-status improvement-status--${item.status.toLowerCase()}`}>
                {statusLabel[item.status]}
              </em>
            </button>
            {detail?.id === item.id && <div className="improvement-center__detail">
              <p>{item.description}</p>
              <dl><dt>Impacto</dt><dd>{impacts.find(value => value.value === item.userImpact)?.title}</dd>
                <dt>Ruta</dt><dd>{item.sourceRoute}</dd>
                <dt>Opciones</dt><dd>{item.selectedItems.length ? item.selectedItems.join(", ") : "Sin opciones rápidas"}</dd>
                <dt>Captura</dt><dd>{item.screenshotUrl ? "Adjunta" : "Sin captura"}</dd></dl>
            </div>}
          </article>)}
        </section>}
      </section>
    </aside>
    <ModalAlert isOpen={Boolean(success)} type="success" message={success}
      variant="toast" autoCloseTime={2800} onClose={() => setSuccess("")} />
  </>;
};
