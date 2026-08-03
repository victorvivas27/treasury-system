import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiArrowDownCircle, FiArrowLeft, FiBarChart2, FiBookOpen, FiCalendar,
  FiCheck, FiClock, FiCreditCard, FiDollarSign, FiEdit3, FiEye, FiFileText, FiFilter,
  FiLogIn, FiLogOut, FiMessageSquare, FiPlus, FiRefreshCw, FiSave, FiSlash, FiTag, FiUser,
  FiUsers, FiX }
  from "react-icons/fi";
import type {
  FinancialSummary, IncomeCategory, IncomeFilters, IncomePayload,
  TreasuryDashboardOverview, TreasuryIncome,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { CompactSelect } from "@/shared/ui/compactselect/CompactSelect";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import {
  INCOME_CATEGORIES, INCOME_PAYMENT_METHODS, incomeCategoryLabel, incomePaymentLabel,
} from "@/shared/constants/IncomeConstants";
import "./ExpensesPage.css";
import "./IncomesPage.css";
import "./IncomesSkeleton.css";

const repository = new TreasuryRepositoryImpl();
const years = Array.from({ length: 10 }, (_, index) => 2026 + index);
const today = new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const emptySummary: FinancialSummary = {
  schoolYear: 2026, feeIncome: 0, otherIncome: 0,
  totalIncome: 0, totalExpenses: 0, availableBalance: 0,
};
const initialForm = (year: number, course?: string): IncomePayload => ({
  schoolYear: year, description: "", amount: 0, incomeDate: today, category: "RAFFLE", course,
});
type IncomeView = "ALL" | "FEES" | "OTHER";

export const IncomesPage = () => {
  const { user } = useAuth();
  const canManage = user?.rol === "ADMIN";
  const [year, setYear] = useState(2026);
  const [view, setView] = useState<IncomeView>("ALL");
  const [items, setItems] = useState<TreasuryIncome[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [feePayments, setFeePayments] = useState<TreasuryDashboardOverview["recentMovements"]>([]);
  const [filters, setFilters] = useState<IncomeFilters>({
    status: "ACTIVE",
    sort: "DATE_DESC",
  });
  const [form, setForm] = useState<IncomePayload>(initialForm(year));
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<TreasuryIncome | null>(null);
  const [editing, setEditing] = useState<TreasuryIncome | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [managedCourse, setManagedCourse] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    !["status", "sort"].includes(key) && value !== undefined && value !== "").length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incomes, overview] = await Promise.all([
        repository.listIncomes(year, filters), repository.dashboardOverview(year),
      ]);
      setItems(incomes);
      setSummary(overview.finances);
      setFeePayments(overview.recentMovements.filter(item => item.type === "CUOTA"));
    } catch {
      setError("No fue posible cargar los ingresos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [year, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    repository.getManagedCourse()
      .then(setManagedCourse)
      .catch(() => setError("No fue posible cargar el curso administrado."));
  }, []);

  useEffect(() => {
    if (managedCourse && formOpen && !editing && !form.course) {
      setForm(current => ({ ...current, course: managedCourse }));
    }
  }, [managedCourse, formOpen, editing, form.course]);

  const registeredUsers = useMemo(
    () => [...new Set(items.map((item) => item.registeredBy))].sort(), [items],
  );
  const setFilter = <K extends keyof IncomeFilters>(key: K, value: IncomeFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));

  const openCreate = () => {
    setEditing(null); setForm(initialForm(year, managedCourse || undefined)); setFormOpen(true);
  };
  const openEdit = (income: TreasuryIncome) => {
    setEditing(income); setDetail(null);
    setForm({
      schoolYear: income.schoolYear, description: income.description, amount: income.amount,
      incomeDate: income.incomeDate, category: income.category, source: income.source,
      paymentMethod: income.paymentMethod, receiptNumber: income.receiptNumber,
      course: income.course, familyId: income.familyId, notes: income.notes,
      correctionReason: "",
    });
    setFormOpen(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || form.amount <= 0 || !form.incomeDate) {
      setError("Completa la descripción, el monto y la fecha del ingreso."); return;
    }
    if (editing && !form.correctionReason?.trim()) {
      setError("Debes indicar el motivo de la corrección."); return;
    }
    void save();
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await repository.updateIncome(editing.id, form);
        setMessage("El ingreso fue corregido y el cambio quedó auditado.");
      } else {
        await repository.createIncome(form);
        setMessage("El ingreso fue registrado correctamente.");
      }
      setFormOpen(false); setEditing(null); await load();
    } catch {
      setError(editing ? "No fue posible corregir el ingreso. Intenta nuevamente."
        : "No fue posible registrar el ingreso. Revisa que no esté duplicado.");
    } finally { setSaving(false); }
  };
  const cancel = async () => {
    if (!detail || !cancelReason.trim()) {
      setError("Debes indicar el motivo de la anulación."); return;
    }
    setSaving(true);
    try {
      await repository.cancelIncome(detail.id, cancelReason.trim());
      setConfirmCancel(false); setDetail(null); setCancelReason("");
      setMessage("El ingreso fue anulado y dejó de sumarse al total recaudado.");
      await load();
    } catch { setError("No fue posible anular el ingreso. Intenta nuevamente."); }
    finally { setSaving(false); }
  };

  return <main className="expenses-page incomes-page">
    <header className="expenses-header"><div>
      <h1>Ingresos</h1><p>Cuotas y otros ingresos de Tesorería.</p></div>
      {canManage && <button type="button" onClick={openCreate}>
        <FiPlus /> Registrar ingreso</button>}</header>

    <section className="income-summary" aria-label="Resumen financiero">
      {loading ? Array.from({ length: 5 }, (_, index) =>
        <article className="income-summary-skeleton" key={index} aria-hidden="true">
          <div className="skeleton-block" /><div className="skeleton-block" />
          <div className="skeleton-block" />
        </article>) : <>
      <article className={`income-summary-card income-summary-card--balance ${
        summary.availableBalance < 0 ? "is-negative" : ""}`}>
        <div><span>Saldo disponible</span><i><FiDollarSign aria-hidden="true" /></i></div>
        <strong>{money.format(summary.availableBalance)}</strong>
        <small>Ingresos totales menos egresos</small></article>
      <article className="income-summary-card income-summary-card--fees">
        <div><span>Ingresos por cuotas</span><i><FiCreditCard aria-hidden="true" /></i></div>
        <strong>{money.format(summary.feeIncome)}</strong>
        <small>Cuota anual del curso</small></article>
      <article className="income-summary-card income-summary-card--other">
        <div><span>Otros ingresos</span><i><FiLogIn aria-hidden="true" /></i></div>
        <strong>{money.format(summary.otherIncome)}</strong>
        <small>Ingresos extraordinarios activos</small></article>
      <article className="income-summary-card income-summary-card--total">
        <div><span>Ingresos totales</span><i><FiBarChart2 aria-hidden="true" /></i></div>
        <strong>{money.format(summary.totalIncome)}</strong>
        <small>Cuotas más otros ingresos</small></article>
      <article className="income-summary-card income-summary-card--expenses is-expense">
        <div><span>Total de egresos</span><i><FiLogOut aria-hidden="true" /></i></div>
        <strong>{money.format(summary.totalExpenses)}</strong><small>Egresos activos</small></article>
      </>}
    </section>

    <nav className="income-tabs" aria-label="Tipo de ingreso">
      {(["ALL", "FEES", "OTHER"] as const).map((tab) => <button type="button" key={tab}
        className={view === tab ? "is-active" : ""} onClick={() => setView(tab)}>
        {tab === "ALL" ? "Todos" : tab === "FEES" ? "Cuotas" : "Otros ingresos"}
      </button>)}
    </nav>

    {view !== "FEES" && <div className="income-filter-toolbar">
      <button type="button" className="income-filter-trigger" onClick={() => setFiltersOpen(true)}>
        <FiFilter aria-hidden="true" /> Filtros
        {activeFilters > 0 && <span>{activeFilters}</span>}
      </button>
    </div>}

    {view !== "FEES" && filtersOpen && <div className="income-filter-backdrop"
      onClick={() => setFiltersOpen(false)}>
    <aside className="expenses-filters" aria-label="Filtros de ingresos" role="dialog"
      aria-modal="true" onClick={event => event.stopPropagation()}>
      <header><div><FiFilter aria-hidden="true" /><h2>Filtros</h2></div>
        <button type="button" aria-label="Cerrar filtros"
          onClick={() => setFiltersOpen(false)}><FiX /></button></header>
      <label className="income-filter-search"><span>Buscar</span>
        <input placeholder="Descripción, origen o comprobante"
        value={filters.search ?? ""} onChange={(e) => setFilter("search", e.target.value)} /></label>
      <label><span>Año</span><select value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {years.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Mes</span><select value={filters.month ?? ""}
        onChange={(e) => setFilter("month", e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Todos</option>{Array.from({ length: 12 }, (_, index) =>
          <option value={index + 1} key={index}>{new Intl.DateTimeFormat("es-CL",
            { month: "long" }).format(new Date(2026, index, 1))}</option>)}</select></label>
      <label><span>Desde</span><input type="date" value={filters.dateFrom ?? ""}
        onChange={(e) => setFilter("dateFrom", e.target.value)} /></label>
      <label><span>Hasta</span><input type="date" value={filters.dateTo ?? ""}
        onChange={(e) => setFilter("dateTo", e.target.value)} /></label>
      <label><span>Categoría</span><select value={filters.category ?? ""}
        onChange={(e) => setFilter("category", e.target.value as IncomeCategory)}>
        <option value="">Todas</option>{INCOME_CATEGORIES.map((item) =>
          <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <label><span>Curso</span><input value={filters.course ?? ""}
        onChange={(e) => setFilter("course", e.target.value)} /></label>
      <label><span>Medio</span><select value={filters.paymentMethod ?? ""}
        onChange={(e) => setFilter("paymentMethod", e.target.value as IncomeFilters["paymentMethod"])}>
        <option value="">Todos</option>{INCOME_PAYMENT_METHODS.map((item) =>
          <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <label><span>Registrado por</span><select value={filters.registeredBy ?? ""}
        onChange={(e) => setFilter("registeredBy", e.target.value)}>
        <option value="">Todos</option>{registeredUsers.map((name) =>
          <option key={name}>{name}</option>)}</select></label>
      <label><span>Ordenar</span><select value={filters.sort}
        onChange={(e) => setFilter("sort", e.target.value as IncomeFilters["sort"])}>
        <option value="DATE_DESC">Fecha más reciente</option><option value="DATE_ASC">Fecha más antigua</option>
        <option value="AMOUNT_DESC">Monto mayor</option><option value="AMOUNT_ASC">Monto menor</option>
        <option value="DESCRIPTION">Descripción</option><option value="CATEGORY">Categoría</option>
      </select></label>
      <footer className="income-filter-actions">
        <button type="button" className="income-filter-clear" onClick={() =>
          setFilters({ status: "ACTIVE", sort: "DATE_DESC" })}>
          <FiRefreshCw aria-hidden="true" /> Limpiar filtros</button>
        <button type="button" className="income-filter-apply"
          onClick={() => setFiltersOpen(false)}>
          <FiCheck aria-hidden="true" /> Ver resultados</button>
      </footer>
    </aside></div>}

    {view === "FEES" && (loading
      ? <section className="fee-payment-grid" aria-label="Cargando pagos">
          {Array.from({ length: 4 }, (_, index) => <article key={index} aria-hidden="true">
            <div className="skeleton-block" /><div className="skeleton-block" />
          </article>)}
        </section>
      : feePayments.length === 0
        ? <p className="expenses-empty">Aún no hay pagos de cuotas registrados.</p>
        : <section className="fee-payment-grid" aria-label="Historial de pagos de cuotas">
            {feePayments.map(payment => <article className="fee-payment-card" key={payment.id}>
              <div><span><FiCalendar aria-hidden="true" /> {payment.date}</span>
                <strong>+{money.format(payment.amount)}</strong></div>
              <p>{payment.description}</p>
            </article>)}
          </section>)}

    {view !== "FEES" && (loading ? <IncomeCardsSkeleton />
      : items.length === 0 ? <p className="expenses-empty">No hay ingresos extraordinarios para los filtros seleccionados.</p>
      : <section className="expenses-grid">{items.map((item) =>
        <article className={`expense-card income-card ${item.status === "CANCELLED" ? "is-cancelled" : ""}`} key={item.id}>
          <header><span><FiArrowDownCircle /> Ingreso extraordinario</span>
            <b>{item.status === "ACTIVE" ? "Activo" : "Anulado"}</b></header>
          <h2>{item.description}</h2><strong>+{money.format(item.amount)}</strong>
          <footer className="income-card__footer">
            <span><FiCalendar aria-hidden="true" /> {item.incomeDate}</span>
            <button type="button" aria-label={`Ver detalle de ${item.description}`}
              title="Ver detalle" onClick={() => setDetail(item)}><FiEye /></button>
          </footer>
        </article>)}</section>)}

    {formOpen && <div className="expense-modal-overlay"><section className="expense-form-modal"
      role="dialog" aria-modal="true" aria-labelledby="income-form-title">
      <header><div><span>{editing ? "Corrección auditada" : "Nuevo registro"}</span>
        <h2 id="income-form-title">{editing ? "Corregir ingreso" : "Registrar ingreso"}</h2></div>
        <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><FiX /></button></header>
      <form onSubmit={submit}>
        <label className="expense-field-wide"><span>Descripción del ingreso *</span>
          <input required maxLength={250} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label><span>Monto *</span><input type="number" min="1" step="1" required
          value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
        <label><span>Fecha del ingreso *</span><input type="date" required value={form.incomeDate}
          onChange={(e) => setForm({ ...form, incomeDate: e.target.value })} /></label>
        <label><span>Categoría *</span><CompactSelect value={form.category}
          placeholder="Seleccionar categoría" options={INCOME_CATEGORIES}
          onChange={(value) => value && setForm({ ...form,
            category: value as IncomeCategory })} /></label>
        <label><span>Medio de recepción</span><CompactSelect value={form.paymentMethod ?? ""}
          placeholder="No informado" options={INCOME_PAYMENT_METHODS}
          onChange={(value) => setForm({ ...form,
            paymentMethod: value as IncomePayload["paymentMethod"] || undefined })} /></label>
        <label><span>Origen o responsable</span><input maxLength={150} value={form.source ?? ""}
          onChange={(e) => setForm({ ...form, source: e.target.value })} /></label>
        <label><span>Número de comprobante</span><input maxLength={100} value={form.receiptNumber ?? ""}
          onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></label>
        <label><span>Curso relacionado</span><select value={form.course ?? ""}
          disabled={!managedCourse}
          onChange={(e) => setForm({ ...form, course: e.target.value || undefined })}>
          {!managedCourse && <option value="">Cargando curso…</option>}
          {managedCourse && <option value={managedCourse}>{managedCourse}</option>}
          {form.course && form.course !== managedCourse &&
            <option value={form.course}>{form.course} (registro histórico)</option>}
        </select></label>
        <label><span>ID de familia relacionada</span><input type="number" min="1"
          value={form.familyId ?? ""} onChange={(e) => setForm({ ...form,
            familyId: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="expense-field-wide"><span>Observaciones</span><textarea maxLength={1000}
          value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        {editing && <label className="expense-field-wide"><span>Motivo de la corrección *</span>
          <textarea required maxLength={500} value={form.correctionReason ?? ""}
            onChange={(e) => setForm({ ...form, correctionReason: e.target.value })} /></label>}
        <footer><button type="button" onClick={() => setFormOpen(false)}><FiX /> Cancelar</button>
          <button type="submit" disabled={saving}><FiSave />
            {saving ? "Guardando…" : "Guardar ingreso"}</button></footer>
      </form></section></div>}

    {detail && <div className="expense-modal-overlay"><section className="expense-detail-modal income-detail-modal"
      role="dialog" aria-modal="true" aria-labelledby="income-detail-title">
      <button type="button" aria-label="Cerrar" onClick={() => setDetail(null)}><FiX /></button>
      <span className={`expense-detail-status is-${detail.status.toLowerCase()}`}>
        {detail.status === "ACTIVE" ? "Activo" : "Anulado"}</span>
      <h2 id="income-detail-title">{detail.description}</h2><strong className="income-amount">+{money.format(detail.amount)}</strong>
      <dl><div><dt><FiArrowDownCircle /> Tipo</dt><dd>Ingreso extraordinario</dd></div>
        <div><dt><FiCalendar /> Fecha</dt><dd>{detail.incomeDate}</dd></div>
        <div><dt><FiTag /> Categoría</dt><dd>{incomeCategoryLabel(detail.category)}</dd></div>
        <div><dt><FiLogIn /> Origen</dt><dd>{detail.source || "No informado"}</dd></div>
        <div><dt><FiCreditCard /> Medio</dt><dd>{incomePaymentLabel(detail.paymentMethod)}</dd></div>
        <div><dt><FiFileText /> Comprobante</dt><dd>{detail.receiptNumber || "No informado"}</dd></div>
        <div><dt><FiBookOpen /> Curso</dt><dd>{detail.course || "No relacionado"}</dd></div>
        <div><dt><FiUsers /> Familia</dt><dd>{detail.familyId || "No relacionada"}</dd></div>
        <div className="income-detail-wide"><dt><FiMessageSquare /> Observaciones</dt><dd>{detail.notes || "Sin observaciones"}</dd></div>
        <div><dt><FiUser /> Registrado por</dt><dd>{detail.registeredBy}</dd></div>
        <div className="income-detail-wide"><dt><FiClock /> Fecha de registro</dt><dd>{new Date(detail.createdAt).toLocaleString("es-CL")}</dd></div>
        {detail.cancellationReason && <div className="income-detail-wide"><dt><FiAlertTriangle /> Motivo de anulación</dt><dd>{detail.cancellationReason}</dd></div>}</dl>
      {canManage && detail.status === "ACTIVE" && <footer>
        <button type="button" onClick={() => openEdit(detail)}>
          <FiEdit3 aria-hidden="true" /> Corregir ingreso</button>
        <button className="is-danger" type="button" onClick={() => setConfirmCancel(true)}>
          <FiSlash aria-hidden="true" /> Anular ingreso</button>
      </footer>}</section></div>}

    <ModalConfirm isOpen={confirmCancel} title="Anular ingreso"
      message="El registro seguirá visible, pero dejará de sumarse a los ingresos y al saldo."
      confirmLabel="Anular ingreso" cancelLabel="Volver" isLoading={saving}
      compact
      cancelIcon={<FiArrowLeft />} confirmIcon={<FiSlash />}
      onCancel={() => { setConfirmCancel(false); setCancelReason(""); }}
      onConfirm={() => void cancel()}><label>Motivo de la anulación
        <textarea autoFocus maxLength={500} value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Ej.: el ingreso fue registrado dos veces" /></label></ModalConfirm>
    <ModalAlert isOpen={Boolean(message)} type="success" title="Operación realizada"
      message={message} onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" title="No fue posible completar la acción"
      message={error} onClose={() => setError("")} />
  </main>;
};

const IncomeCardsSkeleton = () => (
  <section className="expenses-grid" aria-label="Cargando ingresos" role="status">
    {Array.from({ length: 6 }, (_, index) => (
      <article className="expense-card income-card income-card--skeleton" key={index}
        aria-hidden="true">
        <header><div className="skeleton-block" /><div className="skeleton-block" /></header>
        <div className="skeleton-block" /><div className="skeleton-block" />
        <div className="income-details-skeleton">
          {Array.from({ length: 4 }, (_, row) => <div className="skeleton-block" key={row} />)}
        </div>
        <div className="skeleton-block income-action-skeleton" />
      </article>
    ))}
  </section>
);
