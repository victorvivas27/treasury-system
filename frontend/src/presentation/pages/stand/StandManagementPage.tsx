import { PiEyeLight, PiEyeClosedLight } from "react-icons/pi";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent,
  type PointerEvent as ReactPointerEvent } from "react";
import {
  FiAlertTriangle, FiBox, FiCheckCircle, FiCopy, FiDollarSign, FiEdit2, FiPlus,
  FiMessageSquare, FiRefreshCw, FiSettings, FiShoppingCart, FiTrash2, FiX,
  FiTrendingUp, FiMaximize2, FiDownload,
} from "react-icons/fi";
import { FcExpand } from "react-icons/fc";
import { useSearchParams } from "react-router-dom";
import type { SchoolEvent } from "@/core/A-domain/entities/treasury/Treasury";
import type {
  Stand, StandPaymentMethod, StandProduct, StandSale, StandSalePayload, StandSummary,
} from "@/core/A-domain/entities/stand/Stand";
import { StandRepositoryImpl } from "@/core/C-infra/repositories/stand/StandRepositoryImpl";
import { StandUseCases } from "@/core/B-application/use-cases/stand/StandUseCases";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { standCache, readStandResource } from "./standCache";
import { Tooltip as HintTooltip } from "@/shared/ui/tooltip/Tooltip";
import { chileDate, chileTime } from "@/shared/date/chileDateTime";
import { useAuth } from "@/presentation/context/AuthContext";
import { StandSummaryPanel } from "./StandSummaryPanel";
import { type StandPanelTab } from "./standPanelData";
import { printStandSalesReport } from "./standSalesReport";
import "./StandManagementPage.css";

const stands = new StandUseCases(new StandRepositoryImpl());
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const decimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });
const productPresentations = [
  { label: "Pizza entera", presentation: "Entera", equivalence: "1",
    image: "/images/products/pizza-entera.png" },
  { label: "Media pizza", presentation: "Media", equivalence: "0.5",
    image: "/images/products/media-pizza.png" },
  { label: "Porción", presentation: "Porción", equivalence: "0.125",
    image: "/images/products/porcion-pizza.png" },
] as const;
const presentationImage = (presentation?: string) => productPresentations.find(option =>
  option.presentation.toLocaleLowerCase("es") === presentation?.trim().toLocaleLowerCase("es"))?.image;
const paymentLabels: Record<StandPaymentMethod, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transferencia", OTHER: "Otro",
};
const statusLabels = {
  PREPARATION: "Preparación", OPEN: "Abierto", CLOSED: "Cerrado",
} as const;
type Tab = StandPanelTab;
type QueuedSale = {
  clientId: string;
  payload: StandSalePayload;
  total: number;
  units: number;
  status: "pending" | "registering" | "confirmed" | "error";
  error?: string;
};

const standModalAnchor = (rect: DOMRect, width: number, height: number) => ({
  top: Math.max(12, Math.min(rect.top, window.innerHeight - height - 12) - 100),
  left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
});

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  const errors = (error as { response?: { data?: { errors?: Record<string, string> } } })
    .response?.data?.errors;
  return errors ? Object.values(errors).join(" ") : fallback;
};

export const StandManagementPage = () => {
  const { user } = useAuth();
  const readOnly = user?.rol === "USER";
  const [searchParams] = useSearchParams();
  const requestedEventId = Number(searchParams.get("eventId"));
  const cache = useMemo(() => standCache(user?.id, readOnly), [user?.id, readOnly]);
  const [year, setYear] = useState(() => {
    const requestedYear = Number(searchParams.get("year"));
    return Number.isInteger(requestedYear) && requestedYear >= 2026 && requestedYear <= 2035
      ? requestedYear : cache.selection.year;
  });
  const initialEvents = cache.events(year).getSnapshot().data;
  const initialEventId = initialEvents?.some(item => item.id === requestedEventId) ? requestedEventId
    : initialEvents?.some(item => item.id === cache.selection.eventId) ? cache.selection.eventId : initialEvents?.[0]?.id ?? 0;
  const initialStands = initialEventId ? cache.list(initialEventId).getSnapshot().data : undefined;
  const initialStand = initialStands?.find(item => item.id === cache.selection.standId) ?? initialStands?.[0];
  const [tab, setTab] = useState<Tab>(readOnly || searchParams.get("tab") === "summary" ? "summary" : cache.selection.tab);
  const initialPanel = initialStand ? cache.panel(initialStand.id, tab).getSnapshot().data : undefined;
  const [events, setEvents] = useState(initialEvents ?? []);
  const [eventId, setEventId] = useState(initialEventId);
  const [standList, setStandList] = useState<Stand[]>(initialStands ?? []);
  const [selected, setSelected] = useState<Stand | undefined>(initialStand);
  const [products, setProducts] = useState<StandProduct[]>(initialPanel?.products ?? []);
  const [sales, setSales] = useState<StandSale[]>(initialPanel?.sales ?? []);
  const [summary, setSummary] = useState<StandSummary | undefined>(initialPanel?.summary);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<StandSummary>();
  const [closing, setClosing] = useState(false);
  const [standToDelete, setStandToDelete] = useState<Stand>();
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operationalLoading, setOperationalLoading] = useState(false);
  const [loadedPanelKey, setLoadedPanelKey] = useState<string | undefined>(initialPanel && initialStand ? `${initialStand.id}:${tab}` : undefined);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(Boolean(initialEvents));
  const [loadedStandsEvent, setLoadedStandsEvent] = useState(initialStands ? initialEventId : 0);
  const [loadError, setLoadError] = useState("");
  const eventsRequest = useRef(0);
  const standsRequest = useRef(0);
  const [feedback, setFeedback] = useState("");
  const [modalAnchor, setModalAnchor] = useState<{ top: number; left: number }>();
  const operationalRequest = useRef(0);

  const loadEvents = useCallback(async (force = false) => {
    const request = ++eventsRequest.current;
    setLoading(true);
    setLoadError("");
    try {
      const orderedEvents = await readStandResource(cache.events(year), force);
      if (request !== eventsRequest.current) return;
      const data = orderedEvents;
      setEvents(orderedEvents);
      setEventId(current => data.some(item => item.id === current) ? current
        : (orderedEvents.find(item => item.id === requestedEventId)?.id ?? orderedEvents[0]?.id ?? 0));
    } catch (error) {
      if (request === eventsRequest.current) setLoadError(errorMessage(error, "No fue posible cargar los eventos."));
    } finally {
      if (request === eventsRequest.current) { setHasLoadedEvents(true); setLoading(false); }
    }
  }, [year, cache, requestedEventId]);

  const loadStands = useCallback(async (force = false) => {
    const request = ++standsRequest.current;
    if (!eventId) {
      setStandList([]);
      setSelected(undefined);
      return;
    }
    try {
      const data = await readStandResource(cache.list(eventId), force);
      if (request !== standsRequest.current) return;
      setStandList(data);
      setSelected(current => data.find(item => item.id === current?.id) ?? data[0]);
    } catch (error) {
      if (request === standsRequest.current) setLoadError(errorMessage(error, "No fue posible cargar los stands."));
    } finally { if (request === standsRequest.current) setLoadedStandsEvent(eventId); }
  }, [eventId, cache]);

  const loadOperationalData = useCallback(async (force = false) => {
    const request = ++operationalRequest.current;
    if (!selected) {
      setLoadedPanelKey(undefined);
      setOperationalLoading(false);
      return;
    }
    const panelTab: Tab = readOnly ? "summary" : tab;
    const panelKey = `${selected.id}:${panelTab}`;
    setOperationalLoading(true);
    try {
      const data = await readStandResource(cache.panel(selected.id, panelTab), force);
      if (request !== operationalRequest.current) return;
      if (data.products) setProducts(data.products);
      if (data.sales) setSales(data.sales);
      if (data.summary) setSummary(data.summary);
      setLoadedPanelKey(panelKey);
    } catch (error) {
      if (request !== operationalRequest.current) return;
      setLoadError(errorMessage(error, "No fue posible actualizar el stand."));
    } finally {
      if (request === operationalRequest.current) setOperationalLoading(false);
    }
  }, [selected?.id, readOnly, tab, cache]);

  useEffect(() => { void loadEvents(); return () => { eventsRequest.current += 1; }; }, [loadEvents]);
  useEffect(() => { void loadStands(); return () => { standsRequest.current += 1; }; }, [loadStands]);
  useEffect(() => { void loadOperationalData(); return () => { operationalRequest.current += 1; }; }, [loadOperationalData]);
  useEffect(() => { Object.assign(cache.selection, { year, eventId, standId: selected?.id, tab }); }, [cache, year, eventId, selected?.id, tab]);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const updateSelected = (value: Stand, message: string) => {
    setSelected(value);
    setStandList(current => current.map(item => item.id === value.id ? value : item));
    setFeedback(message);
  };

  const changeStatus = async (action: "open" | "close" | "reopen") => {
    if (!selected) return;
    try {
      const updated = await stands[action](selected.id);
      updateSelected(updated, action === "open" ? "Jornada abierta."
        : action === "close" ? "Jornada cerrada." : "Jornada reabierta.");
      await loadOperationalData(true);
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible cambiar el estado."));
    }
  };

  const requestClose = async () => {
    if (!selected) return;
    try {
      setCloseSummary(await stands.summary(selected.id));
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible calcular el cierre de jornada."));
    }
  };

  const confirmClose = async () => {
    if (!selected) return;
    setClosing(true);
    try {
      const updated = await stands.close(selected.id);
      updateSelected(updated, "Jornada cerrada y recaudación enviada al evento.");
      await loadOperationalData(true);
      setCloseSummary(undefined);
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible cerrar la jornada."));
    } finally {
      setClosing(false);
    }
  };

  const confirmDelete = async () => {
    if (!standToDelete) return;
    setDeleting(true);
    try {
      await stands.delete(standToDelete.id);
      setStandToDelete(undefined);
      setSelected(undefined);
      await loadStands(true);
      setFeedback("Stand eliminado. Ahora puedes eliminar el evento si no tiene otros stands.");
    } catch (error) {
      setFeedback(errorMessage(error,
        "No fue posible eliminar el stand. Anula primero todas las ventas activas."));
    } finally {
      setDeleting(false);
    }
  };

  const activeEvent = events.find(item => item.id === eventId);

  const preparing = !loadError && ((!hasLoadedEvents) || (loading && !cache.events(year).getSnapshot().data) || (eventId !== 0 && loadedStandsEvent !== eventId)
    || (selected && loadedPanelKey !== `${selected.id}:${readOnly ? "summary" : tab}`));
  return <>
    <main aria-busy={Boolean(preparing)} className={`stand-page${readOnly ? " stand-page--summary" : ""}`}>
    <header className="stand-page__header">
      <div><h1>{readOnly ? "Resumen de stands" : "Ventas del stand"}</h1>
        <p>{readOnly ? "Consulta las ventas y la recaudación de cada stand."
          : "Administra los productos, las ventas y la caja de tu stand."}</p></div>
    </header>
    <section className="stand-event-navigation" aria-label="Selección de año y evento">
      <div className="stand-year-card">
        <span>Año escolar</span>
        <div>
          <button type="button" aria-label="Año anterior" disabled={year <= 2026 || loading}
            onClick={() => { setSelected(undefined); setStandList([]); setEventId(0); setYear(value => value - 1); }}>‹</button>
          <strong aria-live="polite">{year}</strong>
          <button type="button" aria-label="Año siguiente" disabled={year >= 2035 || loading}
            onClick={() => { setSelected(undefined); setStandList([]); setEventId(0); setYear(value => value + 1); }}>›</button>
        </div>
      </div>
      <fieldset className="stand-event-picker">
        <legend>Elegí un evento</legend>
        {loading && !hasLoadedEvents ? <div role="status" aria-label="Cargando eventos"><Skeleton /><Skeleton width="60%" /></div> : events.length === 0
          ? <p>No hay eventos en {year}.</p>
          : <div className="stand-event-choices">
            {events.map(item => <label className={`stand-event-choice${eventId === item.id ? " is-selected" : ""}`}
              key={item.id}>
              <input type="radio" name="stand-event" value={item.id} checked={eventId === item.id}
                onChange={() => {
                  if (eventId === item.id) return;
                  setSelected(undefined); setStandList([]); setEventId(item.id);
                }} />
              <span className="stand-event-choice__info">
                <span>{item.name}</span>
                <time dateTime={item.eventDate}>{new Date(`${item.eventDate}T12:00:00`).toLocaleDateString("es-CL", {
                  day: "numeric", month: "short", year: "numeric",
                })}</time>
              </span>
              {eventId === item.id && <small>Seleccionado</small>}
            </label>)}
          </div>}
      </fieldset>
      {activeEvent && <div className="stand-event-meta">

        {selected?.eventId === activeEvent.id && <>
          <span className={`stand-status stand-status--${selected.status.toLowerCase()}`}>
            {statusLabels[selected.status]}</span>
          <span className="stand-event-meta__name">{selected.name}</span>
        </>}
      </div>}

    </section>
    {feedback && <p className="stand-page__feedback" role="status">{feedback}</p>}
    {loadError && <div role="alert"><p>{loadError}</p><button type="button" onClick={async () => { setLoadError(""); await loadEvents(true); await loadStands(true); await loadOperationalData(true); }}>Reintentar</button></div>}
    {preparing && !selected && <StandDataSkeleton summary={readOnly} />}
    {!preparing && !loadError && events.length === 0 ? <section className="stand-page__empty">
        <FiAlertTriangle /><h2>{readOnly ? "No hay eventos para consultar" : "Primero crea un evento"}</h2>
        <p>{readOnly ? "Cuando exista un evento con stands, su resumen aparecerá aquí."
          : "Todo stand debe estar asociado a un evento existente."}</p>
      </section> : <>
        {standList.length !== 1 && <div className="stand-page__selector">
          {standList.map(item => <button key={item.id}
            className={selected?.id === item.id ? "is-active" : ""}
            onClick={() => setSelected(item)}>
            <span>{item.name}</span>
          </button>)}
          {!preparing && standList.length === 0 && (readOnly ? <section className="stand-page__empty">
            <FiBox /><h2>No hay stands en este evento</h2>
            <p>Selecciona otro evento o vuelve más tarde.</p>
          </section> : <section className="stand-selector-empty">
            <header className="stand-selector-empty__header">
              <div className="stand-selector-empty__identity">
                <span className="stand-selector-empty__icon"><FiBox /></span>
                <div><span className="stand-status stand-status--preparation">Preparación</span>
                  <h2>Tu stand aparecerá aquí</h2>
                  <p>Aún no hay un stand creado para este evento.</p></div>
              </div>
              <button type="button" onClick={click => {
                setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                  Math.min(320, window.innerWidth - 24), 430));
                setCreating(true);
              }}><FiPlus /> Crear primer stand</button>
            </header>
            <nav className="stand-selector-empty__tabs" aria-label="Vista previa del stand">
              <span className="is-active"><FiBox /> Productos</span>
              <span><FiShoppingCart /> Ventas</span>
              <span><FiTrendingUp /> Resumen</span>
            </nav>
            <div className="stand-selector-empty__preview">
              <article><FiBox /><div><strong>Productos</strong>
                <small>Agrega precios, costos y stock</small></div><b>0</b></article>
              <article><FiShoppingCart /><div><strong>Ventas</strong>
                <small>Registra cada compra del evento</small></div><b>0</b></article>
              <article><FiDollarSign /><div><strong>Recaudación</strong>
                <small>Controla caja y medios de pago</small></div><b>{money.format(0)}</b></article>
            </div>
          </section>)}
        </div>}

        {selected && <section className={`stand-workspace ${operationalLoading
          ? "is-refreshing" : ""}`} aria-busy={operationalLoading}>
          <details className="stand-workspace__overview">
            <summary>
              <strong>Datos del stand</strong>
              <span className="stand-workspace__overview-action">
                <span className="stand-workspace__overview-show" title="Mostrar datos"><PiEyeClosedLight aria-hidden="true" /></span>
                <span className="stand-workspace__overview-hide" title="Ocultar datos"><PiEyeLight aria-hidden="true" /></span>
              </span>
            </summary>
            <header className="stand-workspace__header">
              <div>
              <p>{selected.responsible} · {selected.date} · {selected.startTime.slice(0, 5)}
                –{selected.endTime.slice(0, 5)}</p></div>
            {!readOnly && <div className="stand-workspace__actions">
              <button type="button" onClick={click => {
                setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                  Math.min(320, window.innerWidth - 24), 430));
                setCreating(true);
              }}><FiPlus /> Crear stand</button>
              <button type="button" className="secondary" onClick={async () => {
                await loadStands(true);
                await loadOperationalData(true);
              }} disabled={operationalLoading}><FiRefreshCw /> Recargar</button>
              {selected.status !== "CLOSED" &&
                <button className="secondary" onClick={click => {
                  setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                    Math.min(320, window.innerWidth - 24), 430));
                  setEditing(true);
                }}>
                  <FiSettings /> Configurar</button>}
              <button className="danger" onClick={click => {
                setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                  Math.min(280, window.innerWidth - 24), 190));
                setStandToDelete(selected);
              }}>
                <FiTrash2 /> Eliminar stand</button>
              {selected.status === "PREPARATION" &&
                <button onClick={() => void changeStatus("open")}><FiCheckCircle /> Abrir jornada</button>}
              {selected.status === "OPEN" &&
                <button className="danger" onClick={click => {
                  setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                    Math.min(280, window.innerWidth - 24), 260));
                  void requestClose();
                }}>
                  <FiX /> Cerrar jornada</button>}
              {selected.status === "CLOSED" &&
                <button onClick={() => void changeStatus("reopen")}><FiRefreshCw /> Reabrir</button>}
            </div>}
            </header>
          </details>
          {!readOnly && <nav className="stand-tabs" aria-label="Secciones del stand">
            <button className={tab === "products" ? "is-active" : ""}
              onClick={() => setTab("products")}><FiBox /> Productos</button>
            <button className={tab === "sales" ? "is-active" : ""}
              onClick={() => setTab("sales")}><FiShoppingCart /> Venta rápida</button>
            <button className={tab === "summary" ? "is-active" : ""}
              onClick={() => setTab("summary")}><FiDollarSign /> Resumen</button>
          </nav>}
          {preparing && loadedPanelKey !== `${selected.id}:${readOnly ? "summary" : tab}` && <StandDataSkeleton summary={readOnly || tab === "summary"} />}
          {loadedPanelKey === `${selected.id}:${readOnly ? "summary" : tab}` && <>
            {!readOnly && tab === "products" && <ProductsPanel stand={selected} products={products}
              onSaved={async message => { await loadOperationalData(true); setFeedback(message); }} />}
            {!readOnly && tab === "sales" && <SalesPanel stand={selected} products={products} sales={sales}
              onSaved={async message => { await loadOperationalData(true); setFeedback(message); }} />}
            {(readOnly || tab === "summary") && summary && <StandSummaryPanel summary={summary} />}
          </>}
        </section>}
      </>}
    <ModalConfirm
      isOpen={Boolean(standToDelete)}
      compact
      anchor={modalAnchor}
      confirmVariant="danger"
      title={`Eliminar ${standToDelete?.name ?? "stand"}`}
      message="Se eliminarán definitivamente el stand, sus productos y las ventas anuladas. Si queda alguna venta activa, la operación será rechazada."
      confirmLabel="Eliminar stand"
      cancelLabel="Conservar stand"
      isLoading={deleting}
      confirmIcon={<FiTrash2 />}
      cancelIcon={<FiX />}
      onConfirm={() => void confirmDelete()}
      onCancel={() => setStandToDelete(undefined)}
    />
    <ModalConfirm
      isOpen={Boolean(closeSummary)}
      compact
      anchor={modalAnchor}
      title="Confirmar cierre de jornada"
      message="Revisa el cierre antes de enviar la recaudación al evento asociado."
      confirmLabel="Cerrar y enviar al evento"
      cancelLabel="Seguir vendiendo"
      isLoading={closing}
      confirmIcon={<FiCheckCircle />}
      cancelIcon={<FiX />}
      onConfirm={() => void confirmClose()}
      onCancel={() => setCloseSummary(undefined)}
    >
      {closeSummary && <div className="stand-close-summary">
        <div><span>Total vendido</span><strong>{money.format(closeSummary.totalSold)}</strong></div>
        <div><span>Costo de productos</span><strong>-{money.format(closeSummary.totalCost)}</strong></div>
        <div><span>Comisiones</span><strong>-{money.format(closeSummary.commissions)}</strong></div>
        <div className="is-total"><span>Neto para el evento</span>
          <strong>{money.format(closeSummary.netProfit)}</strong></div>
        <small>El fondo inicial de {money.format(closeSummary.initialFund)} no forma parte de la recaudación.</small>
      </div>}
    </ModalConfirm>
    {!readOnly && creating && <StandForm eventId={eventId}
      event={events.find(item => item.id === eventId) as SchoolEvent | undefined}
      anchor={modalAnchor} onClose={() => { setCreating(false); setModalAnchor(undefined); }}
      onSaved={async value => {
        setCreating(false); await loadStands(true); setSelected(value); setFeedback("Stand creado.");
      }} />}
    {!readOnly && editing && selected && <StandForm eventId={eventId}
      event={events.find(item => item.id === eventId) as SchoolEvent | undefined} stand={selected}
      anchor={modalAnchor} onClose={() => { setEditing(false); setModalAnchor(undefined); }}
      onSaved={async value => {
        setEditing(false); updateSelected(value, "Configuración actualizada.");
      }} />}
  </main></>;
};

const StandDataSkeleton = ({ summary }: { summary: boolean }) => <section role="status" aria-label="Cargando datos del stand" aria-busy="true">
  {summary ? <div className="stand-summary__cards">{["Ganancia neta", "Total vendido", "Efectivo esperado"].map(label =>
    <article key={label}><div><span>{label}</span></div><strong><Skeleton /></strong></article>)}</div>
    : <div className="stand-product-grid">{Array.from({ length: 3 }, (_, index) => <article className="stand-product-card" key={index}>
      <div className="stand-product-card__main"><h3><Skeleton /></h3><p><Skeleton width="65%" /></p><strong><Skeleton /></strong></div>
    </article>)}</div>}
</section>;

const ProductsPanel = ({ stand, products, onSaved }: {
  stand: Stand; products: StandProduct[]; onSaved: (message: string) => Promise<void>;
}) => {
  const variantStock = (product: StandProduct) => product.unitEquivalence != null
    && product.unitEquivalence !== 1 && product.variant
    ? products.find(candidate => candidate.currentStock != null && candidate.unitEquivalence === 1
      && candidate.variant?.trim().toLocaleLowerCase("es")
        === product.variant?.trim().toLocaleLowerCase("es"))?.currentStock
    : product.currentStock;
  const [showForm, setShowForm] = useState(false);
  const [formAnchor, setFormAnchor] = useState<{ top: number; left: number }>();
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const [editingProduct, setEditingProduct] = useState<StandProduct>();
  const [productToDelete, setProductToDelete] = useState<StandProduct>();
  const [deleteAnchor, setDeleteAnchor] = useState<{ top: number; left: number }>();
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [form, setForm] = useState({
    name: "", category: "", variant: "", presentation: "", unitEquivalence: "",
    unitCost: "", price: "", stock: "", available: true,
  });
  const closeForm = () => {
    setForm({ name: "", category: "", variant: "", presentation: "", unitEquivalence: "",
      unitCost: "", price: "", stock: "", available: true });
    setEditingProduct(undefined);
    setShowForm(false);
    setFormAnchor(undefined);
  };
  const editProduct = (product: StandProduct, anchor: { top: number; left: number }) => {
    setForm({
      name: product.name, category: product.category ?? "", variant: product.variant ?? "",
      presentation: product.presentation ?? "",
      unitEquivalence: product.unitEquivalence == null ? "" : String(product.unitEquivalence),
      unitCost: String(product.unitCost), price: String(product.price),
      stock: product.currentStock == null ? "" : String(product.currentStock),
      available: product.available,
    });
    setEditingProduct(product);
    setFormAnchor(anchor);
    setShowForm(true);
  };
  const duplicateProduct = (product: StandProduct, anchor: { top: number; left: number }) => {
    setForm({
      name: product.name, category: product.category ?? "", variant: "",
      presentation: product.presentation ?? "",
      unitEquivalence: product.unitEquivalence == null ? "" : String(product.unitEquivalence),
      unitCost: String(product.unitCost), price: String(product.price),
      stock: product.initialStock == null ? "" : String(product.initialStock),
      available: product.available,
    });
    setEditingProduct(undefined);
    setFormAnchor(anchor);
    setShowForm(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name, category: form.category || undefined, variant: form.variant || undefined,
      presentation: form.presentation || undefined,
      unitEquivalence: form.unitEquivalence === "" ? undefined : Number(form.unitEquivalence),
      unitCost: Number(form.unitCost), price: Number(form.price),
      stock: (form.unitEquivalence === "" || form.unitEquivalence === "1") && form.stock !== ""
        ? Number(form.stock) : undefined,
      available: form.available,
    };
    if (editingProduct) await stands.updateProduct(stand.id, editingProduct.id, payload);
    else await stands.addProduct(stand.id, payload);
    const message = editingProduct ? "Producto actualizado." : "Producto agregado.";
    closeForm();
    await onSaved(message);
  };
  const confirmDelete = async () => {
    if (!productToDelete) return;
    setDeletingProduct(true);
    setDeleteError("");
    try {
      await stands.deleteProduct(stand.id, productToDelete.id);
      setProductToDelete(undefined);
      setDeleteAnchor(undefined);
      await onSaved("Producto eliminado.");
    } catch (error) {
      setDeleteError(errorMessage(error, "No fue posible eliminar el producto."));
    } finally {
      setDeletingProduct(false);
    }
  };
  const startDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (!formAnchor || (event.target as HTMLElement).closest("button")) return;
    dragOffset.current = { x: event.clientX - formAnchor.left, y: event.clientY - formAnchor.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragForm = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragOffset.current) return;
    setFormAnchor({
      left: Math.max(12, Math.min(event.clientX - dragOffset.current.x,
        window.innerWidth - Math.min(320, window.innerWidth - 24) - 12)),
      top: Math.max(12, Math.min(event.clientY - dragOffset.current.y,
        window.innerHeight - 60)),
    });
  };
  return <div className="stand-panel">
    <div className="stand-panel__heading"><div><h3>Catálogo del stand</h3>
      <p>En pizzas, el stock se configura en enteras y se comparte por variante.</p></div>
      {stand.status !== "CLOSED" && <button className="stand-add-product-button"
        onClick={click => {
          setFormAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
            Math.min(320, window.innerWidth - 24), 500));
          setShowForm(true);
        }}>
        <span className="stand-add-product-button__plus"
          aria-hidden="true">+</span>
        Producto</button>}</div>
    {showForm && <div className="stand-modal stand-modal--anchored" role="presentation"
      onMouseDown={closeForm}>
      <form role="dialog" aria-modal="true" aria-labelledby="product-form-title"
        style={formAnchor ? { position: "fixed", top: formAnchor.top, left: formAnchor.left } : undefined}
        onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
        <header className="stand-modal__draggable-header" onPointerDown={startDragging}
          onPointerMove={dragForm} onPointerUp={() => { dragOffset.current = null; }}
          onPointerCancel={() => { dragOffset.current = null; }}><div>
          <span>Catálogo del stand</span><h2 id="product-form-title">
          {editingProduct ? "Editar producto" : "Crear producto"}</h2></div>
          <button type="button" aria-label="Cerrar" onClick={closeForm}><FiX /></button></header>
        <fieldset className="stand-presentation-picker">
          <legend>Imagen y presentación</legend>
          <div>{productPresentations.map(option =>
            <button type="button" key={option.presentation}
              className={form.presentation === option.presentation ? "is-selected" : ""}
              aria-pressed={form.presentation === option.presentation}
              onClick={() => setForm({ ...form, presentation: option.presentation,
                unitEquivalence: option.equivalence })}>
              <img src={option.image} alt="" aria-hidden="true" />
              <span>{option.label}</span>
            </button>)}</div>
        </fieldset>
        <div className="stand-modal__grid">
          <label>Producto<input required maxLength={120} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Categoría<input maxLength={80} value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })} /></label>
          <label>Variante<input maxLength={100} value={form.variant}
            onChange={e => setForm({ ...form, variant: e.target.value })} /></label>
          <label>Equivalencia<input min="0.0001" step="0.0001" type="number"
            placeholder="1, 0.5, 0.125" value={form.unitEquivalence}
            onChange={e => setForm({ ...form, unitEquivalence: e.target.value })} /></label>
          <label>Costo unitario<input required min="0" type="number" value={form.unitCost}
            onChange={e => setForm({ ...form, unitCost: e.target.value })} /></label>
          <label>Precio de venta<input required min="1" type="number" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} /></label>
          {(form.unitEquivalence === "" || form.unitEquivalence === "1") && <label>
            {form.unitEquivalence === "1" ? "Stock de la variante (pizzas enteras)" : "Stock (opcional)"}
            <input min="0" type="number" value={form.stock}
              onChange={e => setForm({ ...form, stock: e.target.value })} /></label>}
        </div>
        <footer><button type="button" onClick={closeForm}><FiX /> Cancelar</button>
          <button type="submit"><FiCheckCircle /> {editingProduct
            ? "Guardar cambios" : "Crear producto"}</button></footer>
      </form>
    </div>}
    <div className="stand-product-grid">
      {products.map(product => <article key={product.id}
        className={`stand-product-card${!product.available ? " is-sold-out" : ""}`}
      >
        <div className="stand-product-card__main">
          <div className="stand-product-card__heading">
            <div className="stand-product-card__identity">
              {presentationImage(product.presentation) && <img
                src={presentationImage(product.presentation)} alt="" aria-hidden="true" />}
              <h4>{product.name}{product.variant ? ` · ${product.variant}` : ""}</h4>
            </div>
            <strong>{money.format(product.price)}</strong>
          </div>
          <span className="stand-product-card__category">
            {product.category || "Sin categoría"}
          </span>
          {(product.presentation || product.unitEquivalence != null) &&
            <p className="stand-product-card__presentation">
              {product.presentation || "Presentación sin especificar"}
              {product.unitEquivalence != null ? ` · Equivale a ${product.unitEquivalence}` : ""}
            </p>}
        </div>
        <small>Costo {money.format(product.unitCost)} · Margen unitario {money.format(
          product.price - product.unitCost)}</small>
        <small>{variantStock(product) == null ? "Stock libre"
          : variantStock(product) === 0 ? "Agotado"
            : `${decimal.format(variantStock(product)!)} pizzas equivalentes disponibles`}</small>
        {stand.status !== "CLOSED" && <div className="stand-product-actions">
          <button type="button" className="stand-product-edit"
            onClick={click => editProduct(product, standModalAnchor(
              click.currentTarget.getBoundingClientRect(), 320, 500))}><FiEdit2 /> Editar</button>
          <button type="button" className="stand-product-edit"
            onClick={click => duplicateProduct(product, standModalAnchor(
              click.currentTarget.getBoundingClientRect(), 320, 500))}><FiCopy /> Duplicar</button>
          <button type="button" className="stand-product-delete" onClick={click => {
            setDeleteAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
              Math.min(280, window.innerWidth - 24), 190));
            setDeleteError("");
            setProductToDelete(product);
          }}><FiTrash2 /> Eliminar</button>
        </div>}
        <span className="stand-product-card__resize-handle" tabIndex={0}
          aria-label={"Redimensionar la tarjeta del producto"}>
          <FiMaximize2 aria-hidden="true" />
          <HintTooltip className="stand-product-card__resize-tooltip" position="top"
            content={"Arrastra la esquina para ajustar el tama\u00f1o"} />
        </span>
      </article>)}
      {products.length === 0 && <p className="stand-page__empty">Agrega el primer producto.</p>}
    </div>
    {deleteError && <p className="stand-page__feedback" role="alert">{deleteError}</p>}
    <ModalConfirm isOpen={Boolean(productToDelete)} compact confirmVariant="danger"
      anchor={deleteAnchor} title="Eliminar producto"
      message={`Se eliminará definitivamente “${productToDelete?.name ?? ""}”.`}
      confirmLabel="Eliminar" cancelLabel="Cancelar" isLoading={deletingProduct}
      onConfirm={() => void confirmDelete()} onCancel={() => {
        setProductToDelete(undefined); setDeleteAnchor(undefined); setDeleteError("");
      }} />
  </div>;
};

const SalesPanel = ({ stand, products, sales, onSaved }: {
  stand: Stand; products: StandProduct[]; sales: StandSale[];
  onSaved: (message: string) => Promise<void>;
}) => {
  const sharedStock = (product: StandProduct) => {
    if (product.unitEquivalence == null || product.unitEquivalence === 1 || !product.variant) {
      return product.currentStock;
    }
    return products.find(candidate => candidate.currentStock != null && candidate.unitEquivalence === 1
      && candidate.variant?.trim().toLocaleLowerCase("es")
        === product.variant?.trim().toLocaleLowerCase("es"))?.currentStock;
  };
  const available = products.filter(item => item.available
    && (sharedStock(item) == null || sharedStock(item)! >= (item.unitEquivalence ?? 1)));
  const presentations = productPresentations.filter(option => available.some(product =>
    product.presentation?.trim().toLocaleLowerCase("es")
      === option.presentation.toLocaleLowerCase("es")));
  const [selectedPresentation, setSelectedPresentation] = useState("");
  const filteredAvailable = selectedPresentation ? available.filter(product =>
    product.presentation?.trim().toLocaleLowerCase("es")
      === selectedPresentation.toLocaleLowerCase("es")) : available;
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number }>>([]);
  const [productId, setProductId] = useState(0);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<StandPaymentMethod>(stand.paymentMethods[0] ?? "CASH");
  const orderedPaymentMethods = [...stand.paymentMethods].sort((left, right) =>
    left === "OTHER" ? 1 : right === "OTHER" ? -1 : 0);
  const [observation, setObservation] = useState("");
  const [observationDraft, setObservationDraft] = useState("");
  const [observationOpen, setObservationOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<StandSale>();
  const [saleToDelete, setSaleToDelete] = useState<StandSale>();
  const [saleToEdit, setSaleToEdit] = useState<StandSale>();
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [deletingSale, setDeletingSale] = useState(false);
  const [editItems, setEditItems] = useState<Array<{
    productId: number; quantity: number | "";
  }>>([]);
  const [editMethod, setEditMethod] = useState<StandPaymentMethod>("CASH");
  const [editObservation, setEditObservation] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editProductToAdd, setEditProductToAdd] = useState(0);
  const [editingSale, setEditingSale] = useState(false);
  const [showReasonAlert, setShowReasonAlert] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [reportError, setReportError] = useState("");
  const [saleQueue, setSaleQueue] = useState<QueuedSale[]>([]);
  const processingQueue = useRef(false);
  const salesPerPage = 3;
  const totalHistoryPages = Math.max(1, Math.ceil(sales.length / salesPerPage));
  const visibleSales = sales.slice(
    historyPage * salesPerPage, (historyPage + 1) * salesPerPage);
  const editTotal = useMemo(() => editItems.reduce((sum, item) =>
    sum + (products.find(product => product.id === item.productId)?.price ?? 0)
      * Number(item.quantity || 0), 0),
  [editItems, products]);
  const total = useMemo(() => cart.reduce((sum, item) =>
    sum + (products.find(product => product.id === item.productId)?.price ?? 0) * item.quantity, 0),
  [cart, products]);
  const selectedProduct = filteredAvailable.find(product => product.id === productId);
  const add = () => {
    if (!productId || quantity < 1) return;
    setCart(current => {
      const found = current.find(item => item.productId === productId);
      return found ? current.map(item => item.productId === productId
        ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, { productId, quantity }];
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: StandSalePayload = {
        items: cart, paymentMethod: method,
        amountReceived: method === "CASH" ? Math.ceil(total) : undefined,
        observation: observation || undefined,
    };
    setSaleQueue(current => [...current, {
      clientId: `${Date.now()}-${Math.random()}`,
      payload,
      total,
      units: cart.reduce((sum, item) => sum + item.quantity, 0),
      status: "pending",
    }]);
    setCart([]); setProductId(0); setQuantity(1); setObservation("");
  };
  useEffect(() => {
    const next = saleQueue.find(item => item.status === "pending");
    if (!next || processingQueue.current) return;
    processingQueue.current = true;
    setSaleQueue(current => current.map(item => item.clientId === next.clientId
      ? { ...item, status: "registering", error: undefined } : item));
    void stands.registerSale(stand.id, next.payload).then(async sale => {
      setSaleQueue(current => current.map(item => item.clientId === next.clientId
        ? { ...item, status: "confirmed" } : item));
      await onSaved(`Venta registrada por ${money.format(sale.total)}.`);
      window.setTimeout(() => setSaleQueue(current =>
        current.filter(item => item.clientId !== next.clientId)), 1800);
    }).catch(error => {
      setSaleQueue(current => current.map(item => item.clientId === next.clientId
        ? { ...item, status: "error", error: errorMessage(error,
          "No fue posible registrar la venta.") } : item));
    }).finally(() => {
      processingQueue.current = false;
      setSaleQueue(current => [...current]);
    });
  }, [saleQueue, stand.id, onSaved]);
  useEffect(() => {
    const hasUnfinishedSales = saleQueue.some(item =>
      item.status === "pending" || item.status === "registering");
    if (!hasUnfinishedSales) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [saleQueue]);
  const cancelSale = async () => {
    if (!saleToCancel || !cancellationReason.trim()) return;
    setCancelling(true);
    try {
      await stands.cancelSale(stand.id, saleToCancel.id, cancellationReason.trim());
      setSaleToCancel(undefined);
      setCancellationReason("");
      await onSaved(`Venta #${saleToCancel.id} anulada. El stock fue restaurado.`);
    } catch (error) {
      await onSaved(errorMessage(error, "No fue posible anular la venta."));
    } finally {
      setCancelling(false);
    }
  };
  const deleteCancelledSale = async () => {
    if (!saleToDelete) return;
    setDeletingSale(true);
    try {
      await stands.deleteCancelledSale(stand.id, saleToDelete.id);
      setSaleToDelete(undefined);
      await onSaved(`Venta #${saleToDelete.id} eliminada definitivamente.`);
    } catch (error) {
      await onSaved(errorMessage(error, "No fue posible eliminar la venta."));
    } finally {
      setDeletingSale(false);
    }
  };
  const startEditingSale = (sale: StandSale) => {
    setSaleToEdit(sale);
    setEditItems(sale.items.map(item => ({
      productId: item.productId, quantity: item.quantity,
    })));
    setEditMethod(sale.paymentMethod);
    setEditObservation(sale.observation ?? "");
    setEditReason("");
    setEditProductToAdd(0);
  };
  const updateSale = async () => {
    if (!saleToEdit || editItems.length === 0) return;
    if (!editReason.trim()) {
      setShowReasonAlert(true);
      return;
    }
    setEditingSale(true);
    try {
      await stands.updateSale(stand.id, saleToEdit.id, {
        items: editItems.map(item => ({
          productId: item.productId, quantity: Number(item.quantity),
        })),
        paymentMethod: editMethod,
        amountReceived: editMethod === "CASH" ? Math.ceil(editTotal) : undefined,
        observation: editObservation || undefined,
        reason: editReason.trim(),
      });
      setSaleToEdit(undefined);
      await onSaved(`Venta #${saleToEdit.id} modificada y stock actualizado.`);
    } catch (error) {
      await onSaved(errorMessage(error, "No fue posible modificar la venta."));
    } finally {
      setEditingSale(false);
    }
  };
  const addEditProduct = () => {
    if (!editProductToAdd || editItems.some(item => item.productId === editProductToAdd)) return;
    setEditItems(current => [...current, { productId: editProductToAdd, quantity: 1 }]);
    setEditProductToAdd(0);
  };
  return <div className="stand-sales-layout">
    <form className="stand-sale-form" onSubmit={submit}>
      <div className="stand-panel__heading"><div><h3>Nueva compra</h3>
        <p>Agrega uno o varios productos.</p></div></div>
      {stand.status !== "OPEN" && <p className="stand-page__warning">
        Abre la jornada para habilitar ventas.</p>}
      <div className="stand-sale-flow-step stand-presentation-sale-picker">
        <span><b>1</b> Presentación</span>
        <div role="group" aria-label="Seleccionar presentación">
          {presentations.map(option => <button type="button" key={option.presentation}
            className={selectedPresentation === option.presentation ? "is-selected" : ""}
            aria-pressed={selectedPresentation === option.presentation}
            onClick={() => {
              setSelectedPresentation(option.presentation);
              setProductId(0);
              setProductPickerOpen(false);
            }}>
            <img src={option.image} alt="" aria-hidden="true" />
            <span>{option.label}</span>
          </button>)}
        </div>
      </div>
      <div className="stand-sale-form__picker">
        <label><span className="stand-sale-step-label"><b>2</b> Variante / producto</span>
          <div className="stand-product-select"
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setProductPickerOpen(false);
          }}>
          <button type="button" className="stand-product-select__trigger"
            aria-haspopup="listbox" aria-expanded={productPickerOpen}
            onClick={() => setProductPickerOpen(open => !open)}>
            {selectedProduct ? <>
              {presentationImage(selectedProduct.presentation) && <img
                src={presentationImage(selectedProduct.presentation)} alt="" aria-hidden="true" />}
              <span>{selectedProduct.name}{selectedProduct.variant
                ? ` · ${selectedProduct.variant}` : ""}</span>
              <strong>{money.format(selectedProduct.price)}</strong>
            </> : <span>Seleccionar…</span>}
            <FcExpand aria-hidden="true" />
          </button>
          {productPickerOpen && <div className="stand-product-select__menu" role="listbox">
            {filteredAvailable.map(product => <button type="button" role="option" key={product.id}
              aria-selected={product.id === productId}
              className={product.id === productId ? "is-selected" : ""}
              onClick={() => { setProductId(product.id); setProductPickerOpen(false); }}>
              {presentationImage(product.presentation) && <img
                src={presentationImage(product.presentation)} alt="" aria-hidden="true" />}
              <span><strong>{product.name}{product.variant ? ` · ${product.variant}` : ""}</strong>
                <small>{product.presentation || "Sin presentación"}</small></span>
              <b>{money.format(product.price)}</b>
            </button>)}
          </div>}
        </div></label>
        <div className="stand-quantity-picker">
          <span><b>3</b> Cantidad</span>
          <div role="group" aria-label="Seleccionar cantidad">
            {[1, 2, 3, 4, 5, 6].map(value => <button key={value} type="button"
              className={quantity === value ? "is-selected" : ""}
              aria-label={`${value} ${value === 1 ? "unidad" : "unidades"}`}
              aria-pressed={quantity === value} onClick={() => setQuantity(value)}>
              {value}</button>)}
          </div>
        </div>
        <button type="button" className="stand-add-sale-item" onClick={add}
          disabled={!productId || quantity < 1}><b>4</b><FiPlus /> Agregar</button>
      </div>
      <div className="stand-sale-form__payment">
        <div className="stand-payment-picker">
          <span><b>5</b> Método de pago</span>
          <div>{orderedPaymentMethods.map(value => <button type="button" key={value}
            className={method === value ? "is-selected" : ""}
            aria-pressed={method === value} onClick={() => setMethod(value)}>
            {paymentLabels[value]}{value === "CASH" && total > 0
              ? ` · ${money.format(Math.ceil(total))}` : ""}</button>)}</div>
        </div>
      </div>
      <footer><div><span>Total</span><strong>{money.format(total)}</strong>
        <button type="button" className="stand-observation-inline" onClick={() => {
          setObservationDraft(observation);
          setObservationOpen(true);
        }}><FiMessageSquare /> {observation ? "Observación agregada" : "Añadir observación"}</button>
      </div>
        <button type="submit" disabled={stand.status !== "OPEN" || cart.length === 0}>
          <b>6</b><FiCheckCircle /> Confirmar venta</button></footer>
    </form>
    <div className="stand-sales-sidebar">
      <aside className="stand-cart-card" aria-label="Pedido actual">
        <header><span><strong>Pedido actual</strong>
          <small>{cart.reduce((sum, item) => sum + item.quantity, 0)} unidades</small></span>
          <strong>{money.format(total)}</strong></header>
        {cart.length > 0 ? <div className="stand-cart" aria-label="Productos agregados">
          {cart.map(item => {
            const product = products.find(value => value.id === item.productId);
            return <div className="stand-cart__item" key={item.productId}><span>{product?.name}
              {product?.variant ? ` · ${product.variant}` : ""}</span>
              <small>{item.quantity} × {money.format(product?.price ?? 0)}</small>
              <strong>{money.format((product?.price ?? 0) * item.quantity)}</strong>
              <button type="button" aria-label="Quitar producto del carrito"
                onClick={() => setCart(current => current.filter(value =>
                  value.productId !== item.productId))}><FiX /> Quitar</button></div>;
          })}
        </div> : <p>Agrega productos para comenzar el pedido.</p>}
      </aside>
    <details className="stand-recent-sales">
      <summary><span><strong>Historial de ventas</strong>
        <small>Más recientes primero · {sales.length} registros</small></span>
        <span className="stand-recent-sales__action">Ver historial <FcExpand /></span>
      </summary>
      <div className="stand-sales-page">
        {visibleSales.map(sale => <article key={sale.id}
          className={sale.status === "CANCELLED" ? "is-cancelled" : ""}>
          <div><strong>Venta #{sale.id}</strong><span>
            {chileTime(sale.soldAt)}</span></div>
          <p>{sale.items.map(item => `${item.quantity}× ${item.productName}`).join(", ")}</p>
          {sale.status === "CANCELLED" && <p className="stand-sale-cancelled">
            Anulada · {sale.cancellationReason}</p>}
          {sale.status !== "CANCELLED" && sale.modifiedAt && <p className="stand-sale-modified">
            Modificada · {sale.modificationReason}</p>}
          <footer><span>{paymentLabels[sale.paymentMethod]}</span>
            <strong>{money.format(sale.total)}</strong>
            {sale.status !== "CANCELLED" && <>
              <button type="button" className="edit-sale"
                onClick={() => startEditingSale(sale)}>Modificar</button>
              <button type="button" className="cancel-sale"
                onClick={() => setSaleToCancel(sale)}>Anular</button>
            </>}
            {sale.status === "CANCELLED" && <button type="button" className="cancel-sale"
              onClick={() => setSaleToDelete(sale)}>Eliminar definitivamente</button>}</footer>
        </article>)}
        {sales.length === 0 && <p className="stand-page__empty">Aún no hay ventas.</p>}
      </div>
      {totalHistoryPages > 1 && <nav className="stand-history-pagination"
        aria-label="Paginación del historial">
        <button type="button" disabled={historyPage === 0}
          onClick={() => setHistoryPage(page => page - 1)}>Anterior</button>
        <span>{historyPage + 1} de {totalHistoryPages}</span>
        <button type="button" disabled={historyPage + 1 >= totalHistoryPages}
          onClick={() => setHistoryPage(page => page + 1)}>Siguiente</button>
      </nav>}
      <div className="stand-history-export">
        <button type="button" disabled={sales.length === 0}
          title="Guardar todo el historial de ventas en PDF" onClick={() => {
          setReportError("");
          try { printStandSalesReport(stand, sales); }
          catch (error) { setReportError(error instanceof Error ? error.message : "No fue posible preparar el PDF."); }
        }}><FiDownload aria-hidden="true" /> Guardar en PDF</button>
        {reportError && <p role="alert">{reportError}</p>}
      </div>
    </details>
    </div>
    {saleQueue.length > 0 && <aside className="stand-sale-queue"
      aria-label="Cola de ventas" aria-live="polite">
      <header><strong>Ventas en proceso</strong><small>{saleQueue.length}</small></header>
      {saleQueue.map((queued, index) => <article key={queued.clientId}
        className={`is-${queued.status}`}>
        <div><strong>Venta {index + 1}</strong><span>{money.format(queued.total)}</span></div>
        <small>{queued.units} {queued.units === 1 ? "unidad" : "unidades"} · {
          queued.status === "pending" ? "En espera"
            : queued.status === "registering" ? "Registrando…"
              : queued.status === "confirmed" ? "Confirmada" : queued.error}</small>
        {queued.status === "error" && <footer>
          <button type="button" onClick={() => setSaleQueue(current => current.map(item =>
            item.clientId === queued.clientId ? { ...item, status: "pending" } : item))}>
            <FiRefreshCw /> Reintentar</button>
          <button type="button" onClick={() => setSaleQueue(current =>
            current.filter(item => item.clientId !== queued.clientId))}>
            <FiX /> Descartar</button>
        </footer>}
      </article>)}
    </aside>}
    <ModalConfirm
      isOpen={observationOpen}
      compact
      title="Observación de la venta"
      message="Agrega una nota opcional para identificar esta compra."
      confirmLabel="Guardar observación"
      cancelLabel="Cancelar"
      confirmIcon={<FiCheckCircle />}
      cancelIcon={<FiX />}
      onConfirm={() => {
        setObservation(observationDraft.trim());
        setObservationOpen(false);
      }}
      onCancel={() => {
        setObservationDraft(observation);
        setObservationOpen(false);
      }}
    >
      <label>Observación
        <textarea autoFocus maxLength={500} value={observationDraft}
          placeholder="Ej.: pedido reservado o indicación especial"
          onChange={event => setObservationDraft(event.target.value)} />
      </label>
    </ModalConfirm>
    <ModalConfirm
      isOpen={Boolean(saleToCancel)}
      compact
      confirmVariant="danger"
      title={`Anular venta #${saleToCancel?.id ?? ""}`}
      message="La venta se conservará en el historial y las unidades volverán al stock."
      confirmLabel="Anular venta"
      cancelLabel="Conservar venta"
      isLoading={cancelling}
      confirmDisabled={!cancellationReason.trim()}
      confirmIcon={<FiTrash2 />}
      cancelIcon={<FiX />}
      onConfirm={() => void cancelSale()}
      onCancel={() => {
        setSaleToCancel(undefined);
        setCancellationReason("");
      }}
    >
      <label>Motivo de anulación
        <textarea autoFocus required maxLength={500} value={cancellationReason}
          placeholder="Ej.: cantidad ingresada incorrectamente"
          onChange={event => setCancellationReason(event.target.value)} />
      </label>
      {!cancellationReason.trim() && <small className="stand-cancel-reason-help">
        Escribe un motivo para habilitar la anulación.</small>}
    </ModalConfirm>
    <ModalConfirm
      isOpen={Boolean(saleToDelete)}
      compact
      confirmVariant="danger"
      title={`Eliminar venta #${saleToDelete?.id ?? ""}`}
      message="Esta venta anulada desaparecerá definitivamente. El stock no se modificará otra vez."
      confirmLabel="Eliminar definitivamente"
      cancelLabel="Conservar registro"
      isLoading={deletingSale}
      confirmIcon={<FiTrash2 />}
      cancelIcon={<FiX />}
      onConfirm={() => void deleteCancelledSale()}
      onCancel={() => setSaleToDelete(undefined)}
    />
    <ModalConfirm
      isOpen={Boolean(saleToEdit)}
      compact
      title={`Modificar venta #${saleToEdit?.id ?? ""}`}
      message="Los cambios ajustarán automáticamente el stock y los totales del stand."
      confirmLabel="Guardar modificación"
      cancelLabel="Descartar cambios"
      isLoading={editingSale}
      confirmDisabled={editItems.length === 0 || editItems.some(item => Number(item.quantity) < 1)}
      confirmIcon={<FiCheckCircle />}
      cancelIcon={<FiX />}
      onConfirm={() => void updateSale()}
      onCancel={() => setSaleToEdit(undefined)}
    >
      <div className="stand-edit-sale">
        <div className="stand-edit-sale__items">
          {editItems.map(item => {
            const product = products.find(value => value.id === item.productId);
            return <div key={item.productId}>
              <span>{product?.name}{product?.variant ? ` · ${product.variant}` : ""}</span>
              <input aria-label={`Cantidad de ${product?.name}`} type="number" min="1"
                value={item.quantity} onFocus={event => event.currentTarget.select()}
                onChange={event => {
                  const normalized = event.target.value.replace(/^0+(?=\d)/, "");
                  setEditItems(current => current.map(value =>
                    value.productId === item.productId
                      ? { ...value, quantity: normalized === "" ? "" : Number(normalized) }
                      : value));
                }} />
              <strong>{money.format(
                (product?.price ?? 0) * Number(item.quantity || 0))}</strong>
              <button type="button" aria-label={`Quitar ${product?.name}`}
                onClick={() => setEditItems(current =>
                  current.filter(value => value.productId !== item.productId))}><FiX /></button>
            </div>;
          })}
        </div>
        <div className="stand-edit-sale__add">
          <select aria-label="Agregar otro producto" value={editProductToAdd}
            onChange={event => setEditProductToAdd(Number(event.target.value))}>
            <option value={0}>Agregar producto…</option>
            {products.filter(product => product.available
              && !editItems.some(item => item.productId === product.id)).map(product =>
              <option key={product.id} value={product.id}>{product.name}
                {product.variant ? ` · ${product.variant}` : ""}</option>)}
          </select>
          <button type="button" disabled={!editProductToAdd} onClick={addEditProduct}>
            <FiPlus /> Agregar</button>
        </div>
        <label>Método de pago<select value={editMethod}
          onChange={event => setEditMethod(event.target.value as StandPaymentMethod)}>
          {orderedPaymentMethods.map(method =>
            <option key={method} value={method}>{paymentLabels[method]}</option>)}
        </select></label>
        {editMethod === "CASH" && <small>Efectivo exacto: {money.format(Math.ceil(editTotal))}</small>}
        <label>Observación<textarea maxLength={500} value={editObservation}
          onChange={event => setEditObservation(event.target.value)} /></label>
        <label>Motivo de modificación (obligatorio)<textarea required maxLength={500}
          value={editReason} placeholder="Ej.: se registraron 3 unidades en lugar de 2"
          onChange={event => setEditReason(event.target.value)} /></label>
        <div className="stand-edit-sale__total"><span>Nuevo total</span>
          <strong>{money.format(editTotal)}</strong></div>
      </div>
    </ModalConfirm>
    <ModalAlert
      isOpen={showReasonAlert}
      type="error"
      title="Falta el motivo"
      message="Debes indicar por qué modificas la venta antes de guardar los cambios."
      buttonLabel="Completar motivo"
      autoCloseTime={0}
      onClose={() => setShowReasonAlert(false)}
    />
  </div>;
};

const StandForm = ({ eventId, event, stand, anchor, onClose, onSaved }: {
  eventId: number; event?: SchoolEvent; stand?: Stand; onClose: () => void;
  anchor?: { top: number; left: number };
  onSaved: (value: Stand) => Promise<void>;
}) => {
  const standNames = Array.from(new Set(event?.participants
    .map(participant => participant.standName.trim()).filter(Boolean) ?? []));
  if (stand && !standNames.includes(stand.name)) standNames.push(stand.name);
  const [form, setForm] = useState({
    name: stand?.name ?? standNames[0] ?? "",
    date: stand?.date ?? event?.eventDate ?? chileDate(),
    startTime: stand?.startTime.slice(0, 5) ?? "09:00",
    endTime: stand?.endTime.slice(0, 5) ?? "18:00",
    responsible: stand?.responsible ?? "", initialFund: String(stand?.initialFund ?? 0),
    debitCommission: stand ? String(stand.debitCommission) : "",
    creditCommission: stand ? String(stand.creditCommission) : "",
    transferCommission: stand ? String(stand.transferCommission) : "",
    paymentMethods: stand?.paymentMethods ?? ["CASH"] as StandPaymentMethod[],
  });
  const [saving, setSaving] = useState(false);
  const toggleMethod = (method: StandPaymentMethod) => setForm(current => ({
    ...current, paymentMethods: current.paymentMethods.includes(method)
      ? current.paymentMethods.filter(value => value !== method)
      : [...current.paymentMethods, method],
  }));
  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault(); setSaving(true);
    try {
      const payload = {
        eventId, name: form.name, date: form.date, startTime: form.startTime,
        endTime: form.endTime, responsible: form.responsible,
        initialFund: Number(form.initialFund), paymentMethods: form.paymentMethods,
        debitCommission: Number(form.debitCommission),
        creditCommission: Number(form.creditCommission),
        transferCommission: Number(form.transferCommission),
      };
      await onSaved(stand ? await stands.update(stand.id, payload)
        : await stands.create(payload));
    } finally { setSaving(false); }
  };
  return <div className={`stand-modal ${anchor ? "stand-modal--anchored" : ""}`}
    role="presentation" onMouseDown={onClose}>
    <form role="dialog" aria-modal="true" aria-labelledby="stand-form-title"
      style={anchor ? { position: "fixed", top: anchor.top, left: anchor.left } : undefined}
      onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
      <header><div><span>{event?.name}</span><h2 id="stand-form-title">
        {stand ? "Editar configuración" : "Configurar nuevo stand"}</h2></div>
        <button type="button" aria-label="Cerrar" onClick={onClose}><FiX /></button></header>
      <div className="stand-modal__grid">
        <label>Nombre del stand{standNames.length > 0
          ? <select required value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}>
            {standNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          : <input required maxLength={120} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />}</label>
        <label>Responsable<input required maxLength={150} value={form.responsible}
          onChange={e => setForm({ ...form, responsible: e.target.value })} /></label>
        <label>Fecha<input required type="date" value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label>Hora de inicio<input required type="text" inputMode="numeric" maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="Ej: 18:00"
          title="Usa formato de 24 horas HH:mm" value={form.startTime}
          onChange={e => setForm({ ...form, startTime: e.target.value })} /></label>
        <label>Hora de término<input required type="text" inputMode="numeric" maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="Ej: 22:00"
          title="Usa formato de 24 horas HH:mm" value={form.endTime}
          onChange={e => setForm({ ...form, endTime: e.target.value })} /></label>
        <label>Fondo inicial<input required min="0" type="number" value={form.initialFund}
          onChange={e => setForm({ ...form, initialFund: e.target.value })} /></label>
        <label>Comisión débito (%)<input required min="0" step="0.01" type="number"
          placeholder="Ej: 3.4 = 3,4%"
          value={form.debitCommission}
          onChange={e => setForm({ ...form, debitCommission: e.target.value })} /></label>
        <label>Comisión crédito (%)<input required min="0" step="0.01" type="number"
          placeholder="Ej: 3.4 = 3,4%"
          value={form.creditCommission}
          onChange={e => setForm({ ...form, creditCommission: e.target.value })} /></label>
        <label>Comisión transferencia (%)<input required min="0" step="0.01" type="number"
          placeholder="Ej: 3.4 = 3,4%"
          value={form.transferCommission}
          onChange={e => setForm({ ...form, transferCommission: e.target.value })} /></label>
      </div>
      <fieldset><legend>Métodos de pago disponibles</legend>
        <div>{(Object.keys(paymentLabels) as StandPaymentMethod[]).map(method =>
          <label key={method}><input type="checkbox"
            checked={form.paymentMethods.includes(method)}
            onChange={() => toggleMethod(method)} />{paymentLabels[method]}</label>)}</div>
      </fieldset>
      <footer><button type="button" onClick={onClose}><FiX /> Cancelar</button>
        <button type="submit" disabled={saving || form.paymentMethods.length === 0}>
          {saving ? "Guardando…" : stand ? <><FiCheckCircle /> Guardar cambios</>
            : <><FiPlus /> Crear stand</>}</button></footer>
    </form>
  </div>;
};
