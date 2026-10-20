import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiArrowDownCircle, FiArrowLeft, FiBarChart2, FiBookOpen, FiCalendar,
  FiCheck, FiClock, FiCreditCard, FiDollarSign, FiDownload, FiEdit3, FiEye, FiFilePlus,
  FiFileText, FiFilter, FiLoader, FiLogIn, FiLogOut, FiMessageSquare, FiPlus, FiRefreshCw,
  FiSave, FiSlash, FiTag, FiTrash2, FiUser, FiUsers, FiX }
  from "react-icons/fi";
import type {
  ExpenseDocument, FinancialSummary, IncomeCategory, IncomeFilters, IncomePayload,
  TreasuryDashboardOverview, TreasuryIncome,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { CompactSelect } from "@/shared/ui/compactselect/CompactSelect";
import { CardValueSkeleton } from "@/shared/ui/skeleton/Skeleton";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { chileDate } from "@/shared/date/chileDateTime";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import {
  INCOME_CATEGORIES, INCOME_PAYMENT_METHODS, incomeCategoryLabel, incomePaymentLabel,
} from "@/shared/constants/IncomeConstants";
import "./ExpensesPage.css";
import "./IncomesPage.css";
import "./IncomesSkeleton.css";
import "./TreasuryMovementFilters.css";
import { MovementFilterSelect } from "./MovementFilterSelect";

const repository = new TreasuryRepositoryImpl();
const years = Array.from({ length: 10 }, (_, index) => 2026 + index);
const today = chileDate();
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
const INCOME_PAGE_SIZE = 3;

export const IncomesPage = () => {
  const { user } = useAuth();
  const canManage = isAdminRole(user?.rol);
  const [searchParams] = useSearchParams();
  const [year, setYear] = useState(() => {
    const requestedYear = Number(searchParams.get("year"));
    return years.includes(requestedYear) ? requestedYear : 2026;
  });
  const [view, setView] = useState<IncomeView>("ALL");
  const [items, setItems] = useState<TreasuryIncome[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [feePayments, setFeePayments] = useState<TreasuryDashboardOverview["recentMovements"]>([]);
  const [incomePage, setIncomePage] = useState(1);
  const [selectedFee, setSelectedFee] = useState<TreasuryDashboardOverview["recentMovements"][number] | null>(null);
  const [filters, setFilters] = useState<IncomeFilters>({
    status: "ACTIVE",
    sort: "DATE_DESC",
  });
  const [form, setForm] = useState<IncomePayload>(initialForm(year));
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<TreasuryIncome | null>(null);
  const [documents, setDocuments] = useState<ExpenseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [documentAction, setDocumentAction] = useState<{
    id: number; type: "view" | "download" | "delete";
  } | null>(null);
  const [editing, setEditing] = useState<TreasuryIncome | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [managedCourse, setManagedCourse] = useState("");
  const [managedCourseLoading, setManagedCourseLoading] = useState(canManage);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    !["status", "sort"].includes(key) && value !== undefined && value !== "").length;
  const initialLoading = (loading && !hasLoaded) || managedCourseLoading;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incomes, overview] = await Promise.all([
        repository.listIncomes(year, filters), repository.dashboardOverview(year),
      ]);
      setItems(incomes);
      setSummary(overview.finances);
      setFeePayments(overview.recentMovements.filter(item => item.type === "CUOTA"));
      setIncomePage(1);
    } catch {
      setError("No fue posible cargar los ingresos. Intenta nuevamente.");
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [year, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!canManage) {
      setManagedCourseLoading(false);
      return;
    }
    setManagedCourseLoading(true);
    repository.getManagedCourse()
      .then(setManagedCourse)
      .catch(() => setError("No fue posible cargar el curso administrado."))
      .finally(() => setManagedCourseLoading(false));
  }, [canManage]);

  useEffect(() => {
    if (!detail) { setDocuments([]); return; }
    setDocumentsLoading(true);
    repository.listIncomeDocuments(detail.id).then(setDocuments)
      .catch(() => setError("No fue posible cargar los documentos adjuntos."))
      .finally(() => setDocumentsLoading(false));
  }, [detail]);

  const uploadDocuments = async (files: FileList | null) => {
    if (!detail || !files?.length) return;
    setDocumentsUploading(true);
    try {
      await repository.uploadIncomeDocuments(detail.id, Array.from(files));
      setDocuments(await repository.listIncomeDocuments(detail.id));
      setMessage("Los documentos fueron cargados correctamente.");
    } catch { setError("No fue posible cargar los documentos. Revisa formato y tamaño."); }
    finally { setDocumentsUploading(false); }
  };

  const openDocument = async (document: ExpenseDocument, download: boolean) => {
    if (!detail) return;
    const previewWindow = download ? null : window.open("", "_blank");
    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.document.title = `Abriendo ${document.originalName}…`;
      previewWindow.document.body.textContent = "Cargando comprobante…";
    }
    setDocumentAction({ id: document.id, type: download ? "download" : "view" });
    try {
      const blob = await repository.getIncomeDocument(detail.id, document.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = window.document.createElement("a");
        link.href = url; link.download = document.originalName; link.click();
      } else if (previewWindow) previewWindow.location.href = url;
      else throw new Error("El navegador bloqueó la vista previa");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      previewWindow?.close();
      setError("No fue posible abrir el documento. Revisa que el navegador permita ventanas emergentes.");
    }
    finally { setDocumentAction(null); }
  };

  const deleteDocument = async (documentId: number) => {
    if (!detail) return;
    setDocumentAction({ id: documentId, type: "delete" });
    try {
      await repository.deleteIncomeDocument(detail.id, documentId);
      setDocuments((current) => current.filter((item) => item.id !== documentId));
      setMessage("El documento fue eliminado.");
    } catch { setError("No fue posible eliminar el documento."); }
    finally { setDocumentAction(null); }
  };

  useEffect(() => {
    if (managedCourse && formOpen && !editing && !form.course) {
      setForm(current => ({ ...current, course: managedCourse }));
    }
  }, [managedCourse, formOpen, editing, form.course]);

  useEffect(() => {
    if (!formOpen && !detail && !selectedFee && !filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving || documentsUploading || confirmCancel) return;
      setFormOpen(false);
      setDetail(null);
      setSelectedFee(null);
      setFiltersOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [formOpen, detail, selectedFee, filtersOpen, saving, documentsUploading, confirmCancel]);

  const incomeRows = useMemo(() => {
    const ordinary = view === "FEES" ? [] : items.map(income => ({
      key: `income-${income.id}`, description: income.description, amount: income.amount,
      date: income.incomeDate, status: income.status, category: income.category,
      income, fee: null,
    }));
    const fees = view === "OTHER" ? [] : feePayments.filter(payment => {
      if (filters.category || filters.paymentMethod || filters.registeredBy || filters.familyId) return false;
      if (filters.status && filters.status !== "ACTIVE") return false;
      if (filters.search && !payment.description.toLocaleLowerCase("es-CL").includes(filters.search.toLocaleLowerCase("es-CL"))) return false;
      if (filters.month && Number(payment.date.slice(5, 7)) !== filters.month) return false;
      if (filters.dateFrom && payment.date < filters.dateFrom) return false;
      if (filters.dateTo && payment.date > filters.dateTo) return false;
      return !filters.course || filters.course.toLocaleLowerCase("es-CL") === managedCourse.toLocaleLowerCase("es-CL");
    }).map(fee => ({ key: `fee-${fee.id}`, description: fee.description, amount: fee.amount,
      date: fee.date, status: fee.status, category: "CUOTA", income: null, fee }));
    return [...ordinary, ...fees].sort((a, b) => {
      if (filters.sort === "AMOUNT_ASC") return a.amount - b.amount;
      if (filters.sort === "AMOUNT_DESC") return b.amount - a.amount;
      if (filters.sort === "DESCRIPTION") return a.description.localeCompare(b.description, "es");
      if (filters.sort === "CATEGORY") return a.category.localeCompare(b.category, "es");
      return filters.sort === "DATE_ASC" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
  }, [items, feePayments, view, filters, managedCourse]);
  const incomePages = Math.max(1, Math.ceil(incomeRows.length / INCOME_PAGE_SIZE));
  const currentIncomePage = Math.min(incomePage, incomePages);
  const visibleIncomes = incomeRows.slice((currentIncomePage - 1) * INCOME_PAGE_SIZE, currentIncomePage * INCOME_PAGE_SIZE);

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
      <h1>Ingresos</h1></div>
      {canManage && <button type="button" onClick={openCreate}>
        <FiPlus /> Registrar ingreso</button>}</header>

    <section className="income-summary" aria-label="Resumen financiero">
      {initialLoading ? ["Saldo disponible", "Ingresos por cuotas", "Otros ingresos",
        "Ingresos totales", "Total de egresos"].map(label =>
        <article className="income-summary-card" key={label}>
          <div><span>{label}</span><i><FiDollarSign aria-hidden="true" /></i></div>
          <CardValueSkeleton /><small>Actualizando información</small>
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

    <div className="income-controls">
      <label className="income-type-filter">Tipo
        <select aria-label="Tipo de ingreso" value={view} onChange={event => { setView(event.target.value as IncomeView); setIncomePage(1); }}>
          <option value="ALL">Todos</option><option value="FEES">Cuotas</option><option value="OTHER">Otros ingresos</option>
        </select>
      </label>
      <button type="button" className="income-filter-trigger" aria-haspopup="dialog" aria-controls="income-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
        <FiFilter aria-hidden="true" /> Filtros
        {activeFilters > 0 && <span>{activeFilters}</span>}
      </button>
    </div>
    {filtersOpen && <div className="income-filter-backdrop movement-filter-backdrop"
      onClick={() => setFiltersOpen(false)}>
    <aside id="income-filters" className="expenses-filters" aria-label="Filtros de ingresos" role="dialog"
      aria-modal="true" onClick={event => event.stopPropagation()}>
      <header><div><FiFilter aria-hidden="true" /><h2>Filtros</h2></div>
        <button type="button" aria-label="Cerrar filtros"
          onClick={() => setFiltersOpen(false)}><FiX /></button></header>
      <label className="income-filter-search movement-filter-search"><span>Buscar</span>
        <input placeholder="Descripción, origen o comprobante"
        value={filters.search ?? ""} onChange={(e) => setFilter("search", e.target.value)} /></label>
      <MovementFilterSelect label="Año" value={String(year)}
        options={years.map(item => ({ value: String(item), label: String(item) }))}
        onChange={value => setYear(Number(value))} />
      <MovementFilterSelect label="Mes" value={String(filters.month ?? "")} placeholder="Todos"
        options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1),
          label: new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(2026, index, 1)) }))}
        onChange={value => setFilter("month", value ? Number(value) : undefined)} />
      <label><span>Desde</span><input type="date" value={filters.dateFrom ?? ""}
        onChange={(e) => setFilter("dateFrom", e.target.value)} /></label>
      <label><span>Hasta</span><input type="date" value={filters.dateTo ?? ""}
        onChange={(e) => setFilter("dateTo", e.target.value)} /></label>
      <MovementFilterSelect label="Categoría" value={filters.category ?? ""} placeholder="Todas"
        options={INCOME_CATEGORIES} onChange={value => setFilter("category", value as IncomeCategory)} />
      <label><span>Curso</span><input value={filters.course ?? ""}
        onChange={(e) => setFilter("course", e.target.value)} /></label>
      <MovementFilterSelect label="Medio" value={filters.paymentMethod ?? ""} placeholder="Todos"
        options={INCOME_PAYMENT_METHODS} onChange={value => setFilter("paymentMethod", value as IncomeFilters["paymentMethod"])} />
      <MovementFilterSelect label="Registrado por" value={filters.registeredBy ?? ""} placeholder="Todos"
        options={registeredUsers.map(name => ({ value: name, label: name }))}
        onChange={value => setFilter("registeredBy", value)} />
      <MovementFilterSelect label="Ordenar" value={filters.sort ?? "DATE_DESC"}
        options={[
          { value: "DATE_DESC", label: "Fecha más reciente" }, { value: "DATE_ASC", label: "Fecha más antigua" },
          { value: "AMOUNT_DESC", label: "Monto mayor" }, { value: "AMOUNT_ASC", label: "Monto menor" },
          { value: "DESCRIPTION", label: "Descripción" }, { value: "CATEGORY", label: "Categoría" },
        ]} onChange={value => setFilter("sort", value as IncomeFilters["sort"])} />
      <footer className="income-filter-actions movement-filter-actions">
        <button type="button" className="income-filter-clear movement-filter-clear" onClick={() =>
          setFilters({ status: "ACTIVE", sort: "DATE_DESC" })}>
          <FiRefreshCw aria-hidden="true" /> Limpiar filtros</button>
        <button type="button" className="income-filter-apply movement-filter-apply"
          onClick={() => setFiltersOpen(false)}>
          <FiCheck aria-hidden="true" /> Ver resultados</button>
      </footer>
    </aside></div>}

    {initialLoading ? <IncomeCardsSkeleton /> : incomeRows.length === 0
      ? <p className="expenses-empty">No hay ingresos para los filtros seleccionados.</p>
      : <section className="expenses-grid income-results" aria-label="Listado de ingresos">
        <span className="income-results__count">{incomeRows.length} ingresos</span>
        {visibleIncomes.map(item => <article className={`expense-card income-card ${item.status === "CANCELLED" ? "is-cancelled" : ""}`} key={item.key}>
          <header><span><FiCalendar aria-hidden="true" /> {item.date}</span>{item.status === "CANCELLED" && <b>Anulado</b>}</header>
          <h2>{item.description}</h2><strong>+{money.format(item.amount)}</strong>
          <footer className="income-card__footer">
            <button type="button" aria-label={`Ver detalle de ${item.description}`} title="Ver detalle"
              onClick={() => item.income ? setDetail(item.income) : setSelectedFee(item.fee)}><FiEye /></button>
          </footer>
        </article>)}
        {Array.from({ length: INCOME_PAGE_SIZE - visibleIncomes.length }, (_, index) =>
          <div key={`empty-${index}`} className="income-card-placeholder" aria-hidden="true" />)}
        {incomePages > 1 && <Pagination currentPage={currentIncomePage} totalPages={incomePages}
          hasPrevious={currentIncomePage > 1} hasNext={currentIncomePage < incomePages}
          onPrevious={() => setIncomePage(Math.max(1, currentIncomePage - 1))}
          onNext={() => setIncomePage(Math.min(incomePages, currentIncomePage + 1))}
          ariaLabel="Paginación de ingresos" />}
      </section>}

    {selectedFee && <div className="expense-modal-overlay"><section className="expense-detail-modal income-detail-modal"
      role="dialog" aria-modal="true" aria-labelledby="income-fee-title">
      <button type="button" aria-label="Cerrar" onClick={() => setSelectedFee(null)}><FiX /></button>
      <span className="expense-detail-status">Pago de cuota</span>
      <h2 id="income-fee-title">{selectedFee.description}</h2><strong className="income-amount">+{money.format(selectedFee.amount)}</strong>
      <dl><div><dt>Fecha</dt><dd>{selectedFee.date}</dd></div><div><dt>Estado</dt><dd>Pagado</dd></div></dl>
    </section></div>}
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
      {detail.status === "CANCELLED" && <span className="expense-detail-status is-cancelled">Anulado</span>}
      <h2 id="income-detail-title">{detail.description}</h2><strong className="income-amount">+{money.format(detail.amount)}</strong>
        {canManage && <label className={`expense-document-upload income-proof-shortcut ${
          documentsUploading ? "is-loading" : ""}`}>
          {documentsUploading ? <FiLoader className="expense-document-spinner" /> : <FiFilePlus />}
          {documentsUploading ? "Subiendo archivos…" : "Adjuntar comprobante"}
          <input type="file" multiple disabled={documentsUploading}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(event) => { void uploadDocuments(event.target.files); event.target.value = ""; }} />
        </label>}
      <dl>
        <div><dt><FiCalendar /> Fecha</dt><dd>{detail.incomeDate}</dd></div>
        <div><dt><FiTag /> Categoría</dt><dd>{incomeCategoryLabel(detail.category)}</dd></div>
        {detail.source && <div><dt><FiLogIn /> Origen</dt><dd>{detail.source}</dd></div>}
        {detail.paymentMethod && <div><dt><FiCreditCard /> Medio</dt><dd>{incomePaymentLabel(detail.paymentMethod)}</dd></div>}
        {detail.receiptNumber && <div><dt><FiFileText /> Comprobante</dt><dd>{detail.receiptNumber}</dd></div>}
        {detail.course && <div><dt><FiBookOpen /> Curso</dt><dd>{detail.course}</dd></div>}
        {detail.familyId && <div><dt><FiUsers /> Familia</dt><dd>{detail.familyId}</dd></div>}
        {detail.notes && <div className="income-detail-wide"><dt><FiMessageSquare /> Observaciones</dt><dd>{detail.notes}</dd></div>}
        <div><dt><FiUser /> Registrado por</dt><dd>{detail.registeredBy}</dd></div>
        <div className="income-detail-wide"><dt><FiClock /> Fecha de registro</dt><dd>{new Date(detail.createdAt).toLocaleString("es-CL")}</dd></div>
        {detail.cancellationReason && <div className="income-detail-wide"><dt><FiAlertTriangle /> Motivo de anulación</dt><dd>{detail.cancellationReason}</dd></div>}</dl>
      {(documentsLoading || documentsUploading || documents.length > 0) && <section className="expense-documents" aria-label="Documentos adjuntos">
        <h3><FiFileText /> Documentos adjuntos</h3>

        {canManage && <small>PDF, Word, Excel o imágenes · Hasta 10 MB</small>}
        {documentsUploading && <p className="expense-document-progress" role="status" aria-live="polite">
          <FiLoader className="expense-document-spinner" /> Guardando en almacenamiento seguro…
        </p>}
        {documentsLoading ? <p className="expense-document-progress" role="status">
          <FiLoader className="expense-document-spinner" /> Cargando documentos…</p>
          : documents.length === 0
          ? <p>Este ingreso no tiene documentos.</p>
          : <ul>{documents.map((document) => <li key={document.id}>
            <span><b>{document.originalName}</b><small>{(document.sizeBytes / 1024).toFixed(0)} KB</small></span>
            <div>{["pdf", "jpg", "jpeg", "png", "webp"].includes(document.extension) &&
              <button type="button" title="Ver" aria-label={`Ver ${document.originalName}`}
                disabled={documentAction !== null}
                onClick={() => void openDocument(document, false)}>
                {documentAction?.id === document.id && documentAction.type === "view"
                  ? <FiLoader className="expense-document-spinner" /> : <FiEye />}</button>}
              <button type="button" title="Descargar" aria-label={`Descargar ${document.originalName}`}
                disabled={documentAction !== null}
                onClick={() => void openDocument(document, true)}>
                {documentAction?.id === document.id && documentAction.type === "download"
                  ? <FiLoader className="expense-document-spinner" /> : <FiDownload />}</button>
              {canManage && <button type="button" title="Eliminar" aria-label={`Eliminar ${document.originalName}`}
                disabled={documentAction !== null}
                onClick={() => void deleteDocument(document.id)}>
                {documentAction?.id === document.id && documentAction.type === "delete"
                  ? <FiLoader className="expense-document-spinner" /> : <FiTrash2 />}</button>}</div>
          </li>)}</ul>}
      </section>}
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
      message={message} compact onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" title="No fue posible completar la acción"
      message={error} onClose={() => setError("")} />
  </main>;
};

const IncomeCardsSkeleton = () => (
  <section className="expenses-grid" aria-label="Cargando ingresos" role="status">
    {Array.from({ length: INCOME_PAGE_SIZE }, (_, index) => (
      <article className="expense-card income-card income-card--skeleton" key={index}
        aria-hidden="true">
        <header><span><FiArrowDownCircle /> Ingreso extraordinario</span>
          <div className="skeleton-block" /></header>
        <div className="skeleton-block" /><div className="skeleton-block" />
        <div className="income-details-skeleton">
          {Array.from({ length: 4 }, (_, row) => <div className="skeleton-block" key={row} />)}
        </div>
        <footer className="income-card__footer"><div className="skeleton-block" />
          <button type="button" className="loading-action-placeholder" disabled
            aria-label="Ver detalle"><FiEye /></button></footer>
      </article>
    ))}
  </section>
);
