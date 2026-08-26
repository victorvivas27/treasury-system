import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent,
  type PointerEvent as ReactPointerEvent } from "react";
import {
  FiAlertTriangle, FiBox, FiCheckCircle, FiCopy, FiCreditCard, FiDollarSign, FiEdit2, FiPercent, FiPlus,
  FiMessageSquare, FiRefreshCw, FiSettings, FiShoppingCart, FiTrash2, FiX,
  FiTrendingUp, FiMaximize2,
} from "react-icons/fi";
import { FcExpand } from "react-icons/fc";
import type { SchoolEvent, SchoolEventOption } from "@/core/A-domain/entities/treasury/Treasury";
import type {
  Stand, StandPaymentMethod, StandProduct, StandSale, StandSalePayload, StandSummary,
} from "@/core/A-domain/entities/stand/Stand";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { StandRepositoryImpl } from "@/core/C-infra/repositories/stand/StandRepositoryImpl";
import { StandUseCases } from "@/core/B-application/use-cases/stand/StandUseCases";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { Tooltip as HintTooltip } from "@/shared/ui/tooltip/Tooltip";
import { chileDate, chileTime } from "@/shared/date/chileDateTime";
import { useAuth } from "@/presentation/context/AuthContext";
import "./StandManagementPage.css";

const eventsRepository = new TreasuryRepositoryImpl();
const stands = new StandUseCases(new StandRepositoryImpl());
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const paymentLabels: Record<StandPaymentMethod, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transferencia", OTHER: "Otro",
};
const statusLabels = {
  PREPARATION: "Preparación", OPEN: "Abierto", CLOSED: "Cerrado",
} as const;
type Tab = "products" | "sales" | "summary";
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

const StandWorkspaceSkeleton = ({ readOnly = false }: { readOnly?: boolean }) => <section className="stand-workspace" role="status"
  aria-label="Cargando eventos y stands">
  <header className="stand-workspace__header"><div><span>Estado del stand</span>
    <Skeleton width="11rem" height="1.4rem" /><Skeleton width="16rem" height=".8rem" />
  </div>{!readOnly && <div className="stand-workspace__actions loading-action-placeholder">
    <button type="button" disabled>Configurar</button><button type="button" disabled>Eliminar</button>
  </div>}</header>
  <div className="stand-page__selector">{Array.from({ length: 3 }, (_, index) =>
    <Skeleton key={index} height="2.8rem" />)}</div>
  <Skeleton height="14rem" />
</section>;

const StandPanelSkeleton = ({ tab }: { tab: Tab }) => <section
  className={`stand-panel-skeleton stand-panel-skeleton--${tab}`}
  role="status" aria-label={tab === "products" ? "Cargando productos"
    : tab === "sales" ? "Cargando ventas" : "Cargando resumen"}>
  {tab === "products" && <div className="stand-product-grid">
    {Array.from({ length: 6 }, (_, index) => <article key={index} aria-hidden="true"
      className="stand-product-card stand-product-card--skeleton">
      <div className="stand-product-card__main">
        <div className="stand-product-card__heading">
          <Skeleton width="58%" height="1rem" />
          <Skeleton width="4.2rem" height="1.1rem" />
        </div>
        <Skeleton className="stand-product-skeleton__category" width="5.5rem" height="1.15rem" />
        <Skeleton width="72%" height=".7rem" />
      </div>
      <Skeleton width="88%" height=".7rem" />
      <Skeleton width="54%" height=".7rem" />
    </article>)}
  </div>}
  {tab === "sales" && <div className="stand-sales-layout">
    {Array.from({ length: 2 }, (_, index) => <article key={index} aria-hidden="true">
      <Skeleton width="46%" height="1rem" />
      <Skeleton height="2.4rem" />
      <Skeleton height="2.4rem" />
      <Skeleton width="62%" height="2.1rem" />
    </article>)}
  </div>}
  {tab === "summary" && <div className="stand-summary__cards">
    {Array.from({ length: 4 }, (_, index) => <article key={index} aria-hidden="true">
      <Skeleton width="65%" height=".75rem" />
      <Skeleton width="82%" height="1.35rem" />
    </article>)}
  </div>}
</section>;

export const StandManagementPage = () => {
  const { user } = useAuth();
  const readOnly = user?.rol === "USER";
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<Array<SchoolEvent | SchoolEventOption>>([]);
  const [eventId, setEventId] = useState(0);
  const [standList, setStandList] = useState<Stand[]>([]);
  const [selected, setSelected] = useState<Stand>();
  const [products, setProducts] = useState<StandProduct[]>([]);
  const [sales, setSales] = useState<StandSale[]>([]);
  const [summary, setSummary] = useState<StandSummary>();
  const [tab, setTab] = useState<Tab>(readOnly ? "summary" : "products");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<StandSummary>();
  const [closing, setClosing] = useState(false);
  const [standToDelete, setStandToDelete] = useState<Stand>();
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operationalLoading, setOperationalLoading] = useState(false);
  const [loadedStandId, setLoadedStandId] = useState<number>();
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [modalAnchor, setModalAnchor] = useState<{ top: number; left: number }>();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = readOnly
        ? await eventsRepository.listEventOptions(year)
        : await eventsRepository.listEvents(year);
      setEvents(data);
      setEventId(current => data.some(item => item.id === current) ? current : (data[0]?.id ?? 0));
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible cargar los eventos."));
    } finally {
      setHasLoadedEvents(true);
      setLoading(false);
    }
  }, [year, readOnly]);

  const loadStands = useCallback(async () => {
    if (!eventId) {
      setStandList([]);
      setSelected(undefined);
      return;
    }
    try {
      const data = await stands.list(eventId);
      setStandList(data);
      setSelected(current => data.find(item => item.id === current?.id) ?? data[0]);
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible cargar los stands."));
    }
  }, [eventId]);

  const loadOperationalData = useCallback(async () => {
    if (!selected) return;
    setOperationalLoading(true);
    try {
      if (readOnly) {
        setSummary(await stands.summary(selected.id));
      } else {
        const [productData, saleData, summaryData] = await Promise.all([
          stands.listProducts(selected.id), stands.listSales(selected.id),
          stands.summary(selected.id),
        ]);
        setProducts(productData);
        setSales(saleData);
        setSummary(summaryData);
      }
      setLoadedStandId(selected.id);
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible actualizar el stand."));
    } finally {
      setOperationalLoading(false);
    }
  }, [selected?.id, readOnly]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);
  useEffect(() => { void loadStands(); }, [loadStands]);
  useEffect(() => { void loadOperationalData(); }, [loadOperationalData]);
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
      await loadOperationalData();
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
      await loadOperationalData();
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
      await loadStands();
      setFeedback("Stand eliminado. Ahora puedes eliminar el evento si no tiene otros stands.");
    } catch (error) {
      setFeedback(errorMessage(error,
        "No fue posible eliminar el stand. Anula primero todas las ventas activas."));
    } finally {
      setDeleting(false);
    }
  };

  return <main className="stand-page">
    <details className="stand-page__overview">
      <summary>
        <span><strong>Ventas del stand</strong><small>Configuración, año escolar y evento</small></span>
        <span className="stand-page__overview-action">Ver opciones <FcExpand /></span>
      </summary>
      <div className="stand-page__overview-content">
        <header className="stand-page__header">
          <div><h1>Ventas del stand</h1>
            <p>{readOnly ? "Consulta el resumen de ventas y recaudación de cada stand."
              : "Configura productos, registra compras y controla la caja en tiempo real."}</p></div>
          {!readOnly && <div className="stand-page__header-actions">
            <button onClick={click => {
              setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
                Math.min(320, window.innerWidth - 24), 430));
              setCreating(true);
            }} disabled={!eventId}>
              <FiPlus /> Crear stand</button>
            <button className="is-reload" onClick={() => void loadStands()}>
              <FiRefreshCw /> Recargar</button>
          </div>}
        </header>

        <section className="stand-page__filters" aria-label="Selección de evento">
          <label>Año escolar<input type="number" value={year}
            onChange={event => setYear(Number(event.target.value))} /></label>
          <label>Evento<select value={eventId}
            onChange={event => setEventId(Number(event.target.value))}>
            {events.length === 0 && <option value={0}>No hay eventos</option>}
            {events.map(item => <option key={item.id} value={item.id}>
              {item.name} · {item.eventDate}
            </option>)}
          </select></label>
        </section>
      </div>
    </details>

    {feedback && <p className="stand-page__feedback" role="status">{feedback}</p>}
    {loading && !hasLoadedEvents ? <StandWorkspaceSkeleton readOnly={readOnly} />
      : events.length === 0 ? <section className="stand-page__empty">
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
          {standList.length === 0 && (readOnly ? <section className="stand-page__empty">
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
              <span className={`stand-status stand-status--${selected.status.toLowerCase()}`}>
                {statusLabels[selected.status]}</span>
              <strong>{selected.name}</strong>
              <span className="stand-workspace__overview-action">Administrar <FcExpand /></span>
            </summary>
            <header className="stand-workspace__header">
              <div>
              <p>{selected.responsible} · {selected.date} · {selected.startTime.slice(0, 5)}
                –{selected.endTime.slice(0, 5)}</p></div>
            {!readOnly && <div className="stand-workspace__actions">
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
          {loadedStandId !== selected.id ? <StandPanelSkeleton tab={readOnly ? "summary" : tab} /> : <>
            {!readOnly && tab === "products" && <ProductsPanel stand={selected} products={products}
              onSaved={async message => { await loadOperationalData(); setFeedback(message); }} />}
            {!readOnly && tab === "sales" && <SalesPanel stand={selected} products={products} sales={sales}
              onSaved={async message => { await loadOperationalData(); setFeedback(message); }} />}
            {(readOnly || tab === "summary") && summary && <SummaryPanel summary={summary} />}
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
        setCreating(false); await loadStands(); setSelected(value); setFeedback("Stand creado.");
      }} />}
    {!readOnly && editing && selected && <StandForm eventId={eventId}
      event={events.find(item => item.id === eventId) as SchoolEvent | undefined} stand={selected}
      anchor={modalAnchor} onClose={() => { setEditing(false); setModalAnchor(undefined); }}
      onSaved={async value => {
        setEditing(false); updateSelected(value, "Configuración actualizada.");
      }} />}
  </main>;
};

const ProductsPanel = ({ stand, products, onSaved }: {
  stand: Stand; products: StandProduct[]; onSaved: (message: string) => Promise<void>;
}) => {
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
      stock: product.initialStock == null ? "" : String(product.initialStock),
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
      stock: form.stock === "" ? undefined : Number(form.stock),
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
      <p>Los campos categoría, variante y stock son opcionales.</p></div>
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
        <div className="stand-modal__grid">
          <label>Producto<input required maxLength={120} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Categoría<input maxLength={80} value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })} /></label>
          <label>Variante<input maxLength={100} value={form.variant}
            onChange={e => setForm({ ...form, variant: e.target.value })} /></label>
          <label>Presentación<input maxLength={80} placeholder="Entera, Media, Porción"
            value={form.presentation}
            onChange={e => setForm({ ...form, presentation: e.target.value })} /></label>
          <label>Equivalencia<input min="0.0001" step="0.0001" type="number"
            placeholder="1, 0.5, 0.125" value={form.unitEquivalence}
            onChange={e => setForm({ ...form, unitEquivalence: e.target.value })} /></label>
          <label>Costo unitario<input required min="0" type="number" value={form.unitCost}
            onChange={e => setForm({ ...form, unitCost: e.target.value })} /></label>
          <label>Precio de venta<input required min="1" type="number" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} /></label>
          <label>Stock (opcional)<input min="0" type="number" value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value })} /></label>
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
            <h4>{product.name}{product.variant ? ` · ${product.variant}` : ""}</h4>
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
        <small>{product.currentStock == null ? "Stock libre"
          : product.currentStock === 0 ? "Agotado" : `${product.currentStock} disponibles`}</small>
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
  const available = products.filter(item => item.available);
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number }>>([]);
  const [productId, setProductId] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<StandPaymentMethod>(stand.paymentMethods[0] ?? "CASH");
  const [received, setReceived] = useState("");
  const [observation, setObservation] = useState("");
  const [observationDraft, setObservationDraft] = useState("");
  const [observationOpen, setObservationOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<StandSale>();
  const [saleToEdit, setSaleToEdit] = useState<StandSale>();
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [editItems, setEditItems] = useState<Array<{
    productId: number; quantity: number | "";
  }>>([]);
  const [editMethod, setEditMethod] = useState<StandPaymentMethod>("CASH");
  const [editReceived, setEditReceived] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editProductToAdd, setEditProductToAdd] = useState(0);
  const [editingSale, setEditingSale] = useState(false);
  const [showReasonAlert, setShowReasonAlert] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
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
        amountReceived: method === "CASH" ? Number(received) : undefined,
        observation: observation || undefined,
    };
    setSaleQueue(current => [...current, {
      clientId: `${Date.now()}-${Math.random()}`,
      payload,
      total,
      units: cart.reduce((sum, item) => sum + item.quantity, 0),
      status: "pending",
    }]);
    setCart([]); setProductId(0); setQuantity(1); setReceived(""); setObservation("");
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
  const startEditingSale = (sale: StandSale) => {
    setSaleToEdit(sale);
    setEditItems(sale.items.map(item => ({
      productId: item.productId, quantity: item.quantity,
    })));
    setEditMethod(sale.paymentMethod);
    setEditReceived(sale.amountReceived == null ? "" : String(sale.amountReceived));
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
        amountReceived: editMethod === "CASH" ? Number(editReceived) : undefined,
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
      <div className="stand-sale-form__picker">
        <label>Producto<select value={productId}
          onChange={e => setProductId(Number(e.target.value))}>
          <option value={0}>Seleccionar…</option>
          {available.map(product => <option key={product.id} value={product.id}>
            {product.name}{product.variant ? ` · ${product.variant}` : ""} · {money.format(product.price)}
          </option>)}</select></label>
        <div className="stand-quantity-picker">
          <span>Cantidad</span>
          <div role="group" aria-label="Seleccionar cantidad">
            {[1, 2, 3, 4, 5, 6].map(value => <button key={value} type="button"
              className={quantity === value ? "is-selected" : ""}
              aria-label={`${value} ${value === 1 ? "unidad" : "unidades"}`}
              aria-pressed={quantity === value} onClick={() => setQuantity(value)}>
              {value}</button>)}
          </div>
        </div>
        <button type="button" onClick={add} disabled={!productId || quantity < 1}>
          <FiPlus /> Agregar</button>
      </div>
      <div className="stand-cart">
        {cart.map(item => {
          const product = products.find(value => value.id === item.productId);
          return <div className="stand-cart__item" key={item.productId}><span>{product?.name}
            {product?.variant ? ` · ${product.variant}` : ""}</span>
            <small>{item.quantity} × {money.format(product?.price ?? 0)}</small>
            <strong>{money.format((product?.price ?? 0) * item.quantity)}</strong>
            <button type="button" aria-label="Quitar producto del carrito"
              onClick={() => setCart(current => current.filter(value =>
                value.productId !== item.productId))}><FiX /> Cancelar</button></div>;
        })}
        {cart.length === 0 && <p>El carrito está vacío.</p>}
      </div>
      <div className="stand-sale-form__payment">
        <label>Método de pago<select value={method}
          onChange={e => setMethod(e.target.value as StandPaymentMethod)}>
          {stand.paymentMethods.map(value => <option key={value} value={value}>
            {paymentLabels[value]}</option>)}</select></label>
        {method === "CASH" && <label>Monto recibido<input required type="number" min={total}
          value={received} onChange={e => setReceived(e.target.value)} />
          <small>Vuelto: {money.format(Math.max(0, Number(received || 0) - total))}</small></label>}
        <div className="stand-observation-field">
          <span>Observación</span>
          <button type="button" className="stand-observation-trigger" onClick={() => {
            setObservationDraft(observation);
            setObservationOpen(true);
          }}>
            <FiMessageSquare /> {observation ? "Editar observación" : "Agregar observación"}
          </button>
        </div>
      </div>
      <footer><div><span>Total</span><strong>{money.format(total)}</strong></div>
        <button type="submit" disabled={stand.status !== "OPEN" || cart.length === 0}>
          <FiCheckCircle /> Enviar venta</button></footer>
    </form>
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
            </>}</footer>
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
    </details>
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
      isOpen={Boolean(saleToEdit)}
      compact
      title={`Modificar venta #${saleToEdit?.id ?? ""}`}
      message="Los cambios ajustarán automáticamente el stock y los totales del stand."
      confirmLabel="Guardar modificación"
      cancelLabel="Descartar cambios"
      isLoading={editingSale}
      confirmDisabled={editItems.length === 0 || editItems.some(item => Number(item.quantity) < 1)
        || (editMethod === "CASH" && Number(editReceived) < editTotal)}
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
          {stand.paymentMethods.map(method =>
            <option key={method} value={method}>{paymentLabels[method]}</option>)}
        </select></label>
        {editMethod === "CASH" && <label>Monto recibido
          <input type="number" min={editTotal} value={editReceived}
            onChange={event => setEditReceived(event.target.value)} />
          <small>Vuelto: {money.format(Math.max(0, Number(editReceived || 0) - editTotal))}</small>
        </label>}
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

const SummaryBar = ({ value, max }: { value: number; max: number }) =>
  <span className="stand-summary-bar" aria-hidden="true"><i style={{
    width: `${Math.max(4, value / Math.max(max, 1) * 100)}%`,
  }} /></span>;

const SummaryPanel = ({ summary }: { summary: StandSummary }) => {
  const maxPayment = Math.max(1, ...Object.values(summary.salesByPaymentMethod));
  const maxProduct = Math.max(1, ...summary.salesByProduct.map(item => item.total));
  const unitsByVariant = summary.salesByProduct.reduce<Record<string, number>>((totals, item) => {
    const variant = item.variant?.trim() || "Sin variante";
    totals[variant] = (totals[variant] ?? 0) + item.units;
    return totals;
  }, {});
  const maxVariantUnits = Math.max(1, ...Object.values(unitsByVariant));
  const maxPresentation = Math.max(1, ...Object.values(summary.unitsByPresentation));
  return <div className="stand-summary">
    <div className="stand-summary__cards">
      <article className="is-highlight"><div><span>Ganancia neta</span><i><FiTrendingUp /></i></div>
        <strong>{money.format(summary.netProfit)}</strong></article>
      <article className="is-sales"><div><span>Total vendido</span><i><FiDollarSign /></i></div>
        <strong>{money.format(summary.totalSold)}</strong></article>
      <article className="is-cash"><div><span>Efectivo esperado</span><i><FiCreditCard /></i></div>
        <strong>{money.format(summary.expectedCash)}</strong>
        <small>Incluye fondo de {money.format(summary.initialFund)}</small></article>
      <article className="is-commissions"><div><span>Comisión débito</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.debitCommission)}</strong></article>
      <article className="is-commissions"><div><span>Comisión crédito</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.creditCommission)}</strong></article>
      <article className="is-commissions"><div><span>Comisión transferencia</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.transferCommission)}</strong></article>
      <article className="is-commissions"><div><span>Costo de productos</span><i><FiBox /></i></div>
        <strong>{money.format(summary.totalCost)}</strong></article>
      <article className="is-count"><div><span>Ventas</span><i><FiShoppingCart /></i></div>
        <strong>{summary.saleCount}</strong></article>
      <article className="is-units"><div><span>Unidades vendidas</span><i><FiBox /></i></div>
        <strong>{summary.unitsSold}</strong></article>
    </div>
    <div className="stand-summary__columns">
      <section className="is-payment"><h3><i><FiCreditCard /></i> Ventas por medio de pago</h3>
        {Object.entries(summary.salesByPaymentMethod).map(([method, total]) =>
          <div className="stand-summary-row" key={method}><div>
            <span>{paymentLabels[method as StandPaymentMethod]}</span>
            <strong>{money.format(total)}</strong></div>
            <SummaryBar value={total} max={maxPayment} /></div>)}</section>
      <section className="is-product"><h3><i><FiBox /></i> Ventas por producto</h3>
        {summary.salesByProduct.map(item => <div
          className="stand-summary-row" key={`${item.product}-${item.category}-${item.variant}`}>
          <div><span>{item.product}{item.variant ? ` · ${item.variant}` : ""}
            <small>{item.units} unidades · {item.category || "Sin categoría"}</small></span>
          <strong>{money.format(item.profit)}<small>Venta {money.format(item.total)} · Costo {
            money.format(item.cost)}</small></strong></div>
          <SummaryBar value={item.total} max={maxProduct} /></div>)}</section>
      <section className="is-variant"><h3><i><FiTrendingUp /></i> Ventas por variante</h3>
        {Object.entries(summary.salesByVariant).map(([variant, total]) =>
          <div className="stand-summary-row stand-summary-variant" key={variant}><div>
            <span className="stand-summary-variant__name">{variant}</span>
            <span className="stand-summary-variant__metric"><small>Cantidad</small>
              <strong>{unitsByVariant[variant] ?? 0} <small>unidades</small></strong></span>
            <span className="stand-summary-variant__metric"><small>Total vendido</small>
              <strong>{money.format(total)}</strong></span>
            </div><SummaryBar value={unitsByVariant[variant] ?? 0} max={maxVariantUnits} /></div>)}
      </section>
      <section className="is-presentation"><h3><i><FiCopy /></i> Unidades por presentación</h3>
        {Object.keys(summary.unitsByPresentation).length === 0
          ? <p>Sin presentaciones configuradas.</p>
          : Object.entries(summary.unitsByPresentation).map(([presentation, units]) =>
            <div className="stand-summary-row" key={presentation}><div>
              <span>{presentation}</span><strong>{units}</strong></div>
              <SummaryBar value={units} max={maxPresentation} /></div>)}
      </section>
      <section className="is-stock"><h3><i><FiAlertTriangle /></i> Alertas de stock</h3>
        {summary.stockAlerts.length === 0 ? <p>Sin alertas de stock.</p>
          : summary.stockAlerts.map(item => <div className="stand-summary-stock" key={item.productId}>
            <span>{item.product}{item.variant ? ` · ${item.variant}` : ""}</span>
            <strong className="stock-alert">{item.soldOut ? "Agotado" : `${item.stock} restantes`}</strong>
          </div>)}</section>
    </div>
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
