import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FiAlertTriangle, FiBox, FiCheckCircle, FiCreditCard, FiDollarSign, FiPercent, FiPlus,
  FiMessageSquare, FiRefreshCw, FiSettings, FiShoppingCart, FiTrash2, FiX,
  FiTrendingUp,
} from "react-icons/fi";
import type { SchoolEvent } from "@/core/A-domain/entities/treasury/Treasury";
import type {
  Stand, StandPaymentMethod, StandProduct, StandSale, StandSummary,
} from "@/core/A-domain/entities/stand/Stand";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { StandRepositoryImpl } from "@/core/C-infra/repositories/stand/StandRepositoryImpl";
import { StandUseCases } from "@/core/B-application/use-cases/stand/StandUseCases";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [eventId, setEventId] = useState(0);
  const [standList, setStandList] = useState<Stand[]>([]);
  const [selected, setSelected] = useState<Stand>();
  const [products, setProducts] = useState<StandProduct[]>([]);
  const [sales, setSales] = useState<StandSale[]>([]);
  const [summary, setSummary] = useState<StandSummary>();
  const [tab, setTab] = useState<Tab>("products");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<StandSummary>();
  const [closing, setClosing] = useState(false);
  const [standToDelete, setStandToDelete] = useState<Stand>();
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [modalAnchor, setModalAnchor] = useState<{ top: number; left: number }>();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventsRepository.listEvents(year);
      setEvents(data);
      setEventId(current => data.some(item => item.id === current) ? current : (data[0]?.id ?? 0));
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible cargar los eventos."));
    } finally {
      setLoading(false);
    }
  }, [year]);

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
    try {
      const [productData, saleData, summaryData] = await Promise.all([
        stands.listProducts(selected.id), stands.listSales(selected.id),
        stands.summary(selected.id),
      ]);
      setProducts(productData);
      setSales(saleData);
      setSummary(summaryData);
    } catch (error) {
      setFeedback(errorMessage(error, "No fue posible actualizar el stand."));
    }
  }, [selected?.id]);

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
    <header className="stand-page__header">
      <div><h1>Ventas del stand</h1>
        <p>Configura productos, registra compras y controla la caja en tiempo real.</p></div>
      <div className="stand-page__header-actions">
        <button onClick={click => {
          setModalAnchor(standModalAnchor(click.currentTarget.getBoundingClientRect(),
            Math.min(320, window.innerWidth - 24), 430));
          setCreating(true);
        }} disabled={!eventId}>
          <FiPlus /> Crear stand</button>
        <button className="is-reload" onClick={() => void loadStands()}>
          <FiRefreshCw /> Recargar</button>
      </div>
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

    {feedback && <p className="stand-page__feedback" role="status">{feedback}</p>}
    {loading ? <p className="stand-page__empty">Cargando eventos…</p>
      : events.length === 0 ? <section className="stand-page__empty">
        <FiAlertTriangle /><h2>Primero crea un evento</h2>
        <p>Todo stand debe estar asociado a un evento existente.</p>
      </section> : <>
        <div className="stand-page__selector">
          {standList.map(item => <button key={item.id}
            className={selected?.id === item.id ? "is-active" : ""}
            onClick={() => setSelected(item)}>
            <span>{item.name}</span><small>{statusLabels[item.status]}</small>
          </button>)}
          {standList.length === 0 && <p>No hay stands configurados para este evento.</p>}
        </div>

        {selected && <section className="stand-workspace">
          <header className="stand-workspace__header">
            <div><span className={`stand-status stand-status--${selected.status.toLowerCase()}`}>
              {statusLabels[selected.status]}</span>
              <h2>{selected.name}</h2>
              <p>{selected.responsible} · {selected.date} · {selected.startTime.slice(0, 5)}
                –{selected.endTime.slice(0, 5)}</p></div>
            <div className="stand-workspace__actions">
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
            </div>
          </header>
          <nav className="stand-tabs" aria-label="Secciones del stand">
            <button className={tab === "products" ? "is-active" : ""}
              onClick={() => setTab("products")}><FiBox /> Productos</button>
            <button className={tab === "sales" ? "is-active" : ""}
              onClick={() => setTab("sales")}><FiShoppingCart /> Venta rápida</button>
            <button className={tab === "summary" ? "is-active" : ""}
              onClick={() => setTab("summary")}><FiDollarSign /> Resumen</button>
          </nav>
          {tab === "products" && <ProductsPanel stand={selected} products={products}
            onSaved={async message => { await loadOperationalData(); setFeedback(message); }} />}
          {tab === "sales" && <SalesPanel stand={selected} products={products} sales={sales}
            onSaved={async message => { await loadOperationalData(); setFeedback(message); }} />}
          {tab === "summary" && summary && <SummaryPanel summary={summary} />}
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
        <div><span>Comisiones</span><strong>-{money.format(closeSummary.commissions)}</strong></div>
        <div className="is-total"><span>Neto para el evento</span>
          <strong>{money.format(closeSummary.netProfit)}</strong></div>
        <small>El fondo inicial de {money.format(closeSummary.initialFund)} no forma parte de la recaudación.</small>
      </div>}
    </ModalConfirm>
    {creating && <StandForm eventId={eventId} event={events.find(item => item.id === eventId)}
      anchor={modalAnchor} onClose={() => { setCreating(false); setModalAnchor(undefined); }}
      onSaved={async value => {
        setCreating(false); await loadStands(); setSelected(value); setFeedback("Stand creado.");
      }} />}
    {editing && selected && <StandForm eventId={eventId}
      event={events.find(item => item.id === eventId)} stand={selected}
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
  const [form, setForm] = useState({
    name: "", category: "", variant: "", price: "", stock: "", available: true,
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await stands.addProduct(stand.id, {
      name: form.name, category: form.category || undefined, variant: form.variant || undefined,
      price: Number(form.price), stock: form.stock === "" ? undefined : Number(form.stock),
      available: form.available,
    });
    setForm({ name: "", category: "", variant: "", price: "", stock: "", available: true });
    setShowForm(false);
    await onSaved("Producto agregado.");
  };
  return <div className="stand-panel">
    <div className="stand-panel__heading"><div><h3>Catálogo del stand</h3>
      <p>Los campos categoría, variante y stock son opcionales.</p></div>
      {stand.status !== "CLOSED" && <button className="stand-add-product-button"
        onClick={() => setShowForm(value => !value)}>
        {showForm ? <FiX /> : <span className="stand-add-product-button__plus"
          aria-hidden="true">+</span>}
        {showForm ? "Cerrar" : "Producto"}</button>}</div>
    {showForm && <form className="stand-inline-form" onSubmit={submit}>
      <label>Producto<input required maxLength={120} value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Categoría<input maxLength={80} value={form.category}
        onChange={e => setForm({ ...form, category: e.target.value })} /></label>
      <label>Variante<input maxLength={100} value={form.variant}
        onChange={e => setForm({ ...form, variant: e.target.value })} /></label>
      <label>Precio<input required min="1" type="number" value={form.price}
        onChange={e => setForm({ ...form, price: e.target.value })} /></label>
      <label>Stock (opcional)<input min="0" type="number" value={form.stock}
        onChange={e => setForm({ ...form, stock: e.target.value })} /></label>
      <button type="submit">Guardar producto</button>
    </form>}
    <div className="stand-product-grid">
      {products.map(product => <article key={product.id}
        className={!product.available ? "is-sold-out" : ""}>
        <div><span>{product.category || "Sin categoría"}</span>
          <h4>{product.name}</h4><p>{product.variant || "Sin variante"}</p></div>
        <strong>{money.format(product.price)}</strong>
        <small>{product.currentStock == null ? "Stock libre"
          : product.currentStock === 0 ? "Agotado" : `${product.currentStock} disponibles`}</small>
      </article>)}
      {products.length === 0 && <p className="stand-page__empty">Agrega el primer producto.</p>}
    </div>
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
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const sale = await stands.registerSale(stand.id, {
      items: cart, paymentMethod: method,
      amountReceived: method === "CASH" ? Number(received) : undefined,
      observation: observation || undefined,
    });
    setCart([]); setProductId(0); setQuantity(1); setReceived(""); setObservation("");
    await onSaved(`Venta registrada por ${money.format(sale.total)}.`);
  };
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
        <label>Cantidad<input type="number" min="1" inputMode="numeric" value={quantity}
          onFocus={event => event.currentTarget.select()}
          onChange={event => {
            const withoutLeadingZeros = event.target.value.replace(/^0+(?=\d)/, "");
            setQuantity(withoutLeadingZeros === "" ? 0 : Number(withoutLeadingZeros));
          }} /></label>
        <button type="button" onClick={add} disabled={!productId || quantity < 1}>
          <FiPlus /> Agregar</button>
      </div>
      <div className="stand-cart">
        {cart.map(item => {
          const product = products.find(value => value.id === item.productId);
          return <div key={item.productId}><span>{product?.name}
            {product?.variant ? ` · ${product.variant}` : ""}</span>
            <small>{item.quantity} × {money.format(product?.price ?? 0)}</small>
            <strong>{money.format((product?.price ?? 0) * item.quantity)}</strong>
            <button type="button" aria-label="Quitar producto"
              onClick={() => setCart(current => current.filter(value =>
                value.productId !== item.productId))}><FiX /></button></div>;
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
          <FiCheckCircle /> Confirmar venta</button></footer>
    </form>
    <section className="stand-recent-sales"><header><div><h3>Historial de ventas</h3>
      <small>Más recientes primero · {sales.length} registros</small></div></header>
      <div className="stand-sales-page">
        {visibleSales.map(sale => <article key={sale.id}
          className={sale.status === "CANCELLED" ? "is-cancelled" : ""}>
          <div><strong>Venta #{sale.id}</strong><span>
            {new Date(sale.soldAt).toLocaleTimeString("es-CL", {
              hour: "2-digit", minute: "2-digit",
            })}</span></div>
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
    </section>
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

const SummaryPanel = ({ summary }: { summary: StandSummary }) =>
  <div className="stand-summary">
    <div className="stand-summary__cards">
      <article className="is-sales"><div><span>Total vendido</span><i><FiDollarSign /></i></div>
        <strong>{money.format(summary.totalSold)}</strong></article>
      <article className="is-cash"><div><span>Efectivo esperado</span><i><FiCreditCard /></i></div>
        <strong>{money.format(summary.expectedCash)}</strong>
        <small>Incluye fondo de {money.format(summary.initialFund)}</small></article>
      <article className="is-commissions"><div><span>Comisiones</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.commissions)}</strong></article>
      <article className="is-highlight"><div><span>Ganancia neta</span><i><FiTrendingUp /></i></div>
        <strong>{money.format(summary.netProfit)}</strong></article>
      <article className="is-count"><div><span>Ventas</span><i><FiShoppingCart /></i></div>
        <strong>{summary.saleCount}</strong></article>
      <article className="is-units"><div><span>Unidades vendidas</span><i><FiBox /></i></div>
        <strong>{summary.unitsSold}</strong></article>
    </div>
    <div className="stand-summary__columns">
      <section><h3>Ventas por medio de pago</h3>
        {Object.entries(summary.salesByPaymentMethod).map(([method, total]) =>
          <div key={method}><span>{paymentLabels[method as StandPaymentMethod]}</span>
            <strong>{money.format(total)}</strong></div>)}</section>
      <section><h3>Ventas por producto</h3>
        {summary.salesByProduct.map(item => <div
          key={`${item.product}-${item.category}-${item.variant}`}>
          <span>{item.product}{item.variant ? ` · ${item.variant}` : ""}
            <small>{item.units} unidades · {item.category || "Sin categoría"}</small></span>
          <strong>{money.format(item.total)}</strong></div>)}</section>
      <section><h3>Ventas por categoría</h3>
        {Object.entries(summary.salesByCategory).map(([category, total]) =>
          <div key={category}><span>{category}</span><strong>{money.format(total)}</strong></div>)}
      </section>
      <section><h3>Ventas por variante</h3>
        {Object.entries(summary.salesByVariant).map(([variant, total]) =>
          <div key={variant}><span>{variant}</span><strong>{money.format(total)}</strong></div>)}
      </section>
      <section><h3>Alertas de stock</h3>
        {summary.stockAlerts.length === 0 ? <p>Sin alertas de stock.</p>
          : summary.stockAlerts.map(item => <div key={item.productId}>
            <span>{item.product}{item.variant ? ` · ${item.variant}` : ""}</span>
            <strong className="stock-alert">{item.soldOut ? "Agotado" : `${item.stock} restantes`}</strong>
          </div>)}</section>
    </div>
  </div>;

const StandForm = ({ eventId, event, stand, anchor, onClose, onSaved }: {
  eventId: number; event?: SchoolEvent; stand?: Stand; onClose: () => void;
  anchor?: { top: number; left: number };
  onSaved: (value: Stand) => Promise<void>;
}) => {
  const [form, setForm] = useState({
    name: stand?.name ?? "",
    date: stand?.date ?? event?.eventDate ?? new Date().toISOString().slice(0, 10),
    startTime: stand?.startTime.slice(0, 5) ?? "09:00",
    endTime: stand?.endTime.slice(0, 5) ?? "18:00",
    responsible: stand?.responsible ?? "", initialFund: String(stand?.initialFund ?? 0),
    debitCommission: String(stand?.debitCommission ?? 0),
    creditCommission: String(stand?.creditCommission ?? 0),
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
        <label>Nombre del stand<input required maxLength={120} value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Responsable<input required maxLength={150} value={form.responsible}
          onChange={e => setForm({ ...form, responsible: e.target.value })} /></label>
        <label>Fecha<input required type="date" value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label>Hora de inicio<input required type="time" value={form.startTime}
          onChange={e => setForm({ ...form, startTime: e.target.value })} /></label>
        <label>Hora de término<input required type="time" value={form.endTime}
          onChange={e => setForm({ ...form, endTime: e.target.value })} /></label>
        <label>Fondo inicial<input required min="0" type="number" value={form.initialFund}
          onChange={e => setForm({ ...form, initialFund: e.target.value })} /></label>
        <label>Comisión débito (%)<input required min="0" step="0.01" type="number"
          value={form.debitCommission}
          onChange={e => setForm({ ...form, debitCommission: e.target.value })} /></label>
        <label>Comisión crédito (%)<input required min="0" step="0.01" type="number"
          value={form.creditCommission}
          onChange={e => setForm({ ...form, creditCommission: e.target.value })} /></label>
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
