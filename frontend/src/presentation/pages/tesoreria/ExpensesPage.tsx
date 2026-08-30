import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiArrowLeft, FiBriefcase, FiCalendar, FiCheck, FiClock,
  FiCreditCard, FiDollarSign, FiDownload, FiEdit3, FiEye, FiFilePlus, FiFileText, FiFilter, FiLogIn,
  FiLoader, FiLogOut, FiMessageSquare, FiMinusCircle, FiPlus, FiRefreshCw, FiSave,
  FiSlash, FiTag, FiTrash2, FiUser, FiX }
  from "react-icons/fi";
import type {
  ExpenseCategory, ExpenseFilters, ExpensePayload,
  ExpenseDocument, FinancialSummary, TreasuryExpense,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { CompactSelect } from "@/shared/ui/compactselect/CompactSelect";
import { CardValueSkeleton } from "@/shared/ui/skeleton/Skeleton";
import { chileDate } from "@/shared/date/chileDateTime";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import {
  EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS,
  expenseCategoryLabel, expensePaymentLabel,
} from "@/shared/constants/ExpenseConstants";
import "./ExpensesPage.css";
import "./ExpensesSkeleton.css";

const repository = new TreasuryRepositoryImpl();
const years = Array.from({ length: 10 }, (_, index) => 2026 + index);
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const emptySummary: FinancialSummary = {
  schoolYear: 2026, feeIncome: 0, otherIncome: 0,
  totalIncome: 0, totalExpenses: 0, availableBalance: 0,
};
const today = chileDate();
const initialForm = (year: number): ExpensePayload => ({
  schoolYear: year, description: "", amount: 0, expenseDate: today,
  category: "MATERIALS",
});

export const ExpensesPage = () => {
  const { user } = useAuth();
  const canManage = isAdminRole(user?.rol);
  const [year, setYear] = useState(2026);
  const [items, setItems] = useState<TreasuryExpense[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filters, setFilters] = useState<ExpenseFilters>({
    status: "ACTIVE",
    sort: "DATE_DESC",
  });
  const [form, setForm] = useState<ExpensePayload>(initialForm(year));
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<TreasuryExpense | null>(null);
  const [documents, setDocuments] = useState<ExpenseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [documentAction, setDocumentAction] = useState<{
    id: number; type: "view" | "download" | "delete";
  } | null>(null);
  const [editing, setEditing] = useState<TreasuryExpense | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    !["status", "sort"].includes(key) && value !== undefined && value !== "").length;
  const initialLoading = loading && !hasLoaded;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expenses, totals] = await Promise.all([
        repository.listExpenses(year, filters),
        repository.financialSummary(year),
      ]);
      setItems(expenses);
      setSummary(totals);
    } catch {
      setError("No fue posible cargar los egresos. Intenta nuevamente.");
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
    if (!detail) { setDocuments([]); return; }
    setDocumentsLoading(true);
    repository.listExpenseDocuments(detail.id).then(setDocuments)
      .catch(() => setError("No fue posible cargar los documentos adjuntos."))
      .finally(() => setDocumentsLoading(false));
  }, [detail]);

  const uploadDocuments = async (files: FileList | null) => {
    if (!detail || !files?.length) return;
    setDocumentsUploading(true);
    try {
      await repository.uploadExpenseDocuments(detail.id, Array.from(files));
      setDocuments(await repository.listExpenseDocuments(detail.id));
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
      const blob = await repository.getExpenseDocument(detail.id, document.id);
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
      await repository.deleteExpenseDocument(detail.id, documentId);
      setDocuments((current) => current.filter((item) => item.id !== documentId));
      setMessage("El documento fue eliminado.");
    } catch { setError("No fue posible eliminar el documento."); }
    finally { setDocumentAction(null); }
  };

  const registeredUsers = useMemo(
    () => [...new Set(items.map((item) => item.registeredBy))].sort(), [items],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm(year));
    setFormOpen(true);
  };

  const openEdit = (expense: TreasuryExpense) => {
    setEditing(expense);
    setDetail(null);
    setForm({
      schoolYear: expense.schoolYear, description: expense.description,
      amount: expense.amount, expenseDate: expense.expenseDate,
      category: expense.category, paymentMethod: expense.paymentMethod,
      recipient: expense.recipient, receiptNumber: expense.receiptNumber,
      notes: expense.notes, correctionReason: "",
    });
    setFormOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || form.amount <= 0 || !form.expenseDate) {
      setError("Completa la descripción, el monto y la fecha del egreso.");
      return;
    }
    if (editing && !form.correctionReason?.trim()) {
      setError("Debes indicar el motivo de la corrección.");
      return;
    }
    if (!editing && form.amount > summary.availableBalance) {
      setConfirmSave(true);
      return;
    }
    void saveExpense();
  };

  const saveExpense = async () => {
    setSaving(true);
    setConfirmSave(false);
    try {
      if (editing) {
        await repository.updateExpense(editing.id, form);
        setMessage("El egreso fue corregido correctamente y el cambio quedó auditado.");
      } else {
        await repository.createExpense(form);
        setMessage("El egreso fue registrado correctamente.");
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch {
      setError(editing
        ? "No fue posible corregir el egreso. Intenta nuevamente."
        : "No fue posible registrar el egreso. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const cancelExpense = async () => {
    if (!detail || !cancelReason.trim()) {
      setError("Debes indicar el motivo de la anulación.");
      return;
    }
    setSaving(true);
    try {
      await repository.cancelExpense(detail.id, cancelReason.trim());
      setConfirmCancel(false);
      setDetail(null);
      setCancelReason("");
      setMessage("El egreso fue anulado correctamente y ya no se descuenta del saldo.");
      await load();
    } catch {
      setError("No fue posible anular el egreso. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const setFilter = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));

  return <main className="expenses-page">
    <header className="expenses-header">
      <div>
        <h1>Egresos</h1>
        <p>Pagos realizados por Tesorería.</p>
      </div>
      {canManage && <button type="button" onClick={openCreate}>
        <FiPlus aria-hidden="true" /> Registrar egreso
      </button>}
    </header>

    <section className="expenses-summary" aria-label="Resumen financiero">
      {initialLoading ? [
        ["Saldo disponible", <FiDollarSign key="balance" />],
        ["Total recaudado", <FiLogIn key="income" />],
        ["Total de egresos", <FiLogOut key="expense" />],
      ].map(([label, icon]) =>
        <article className="expense-summary-card" key={String(label)}>
          <div><span>{label}</span><i>{icon}</i></div><CardValueSkeleton />
          <small>Actualizando información</small>
        </article>) : <>
      <article className={`expense-summary-card expense-summary-card--balance ${
        summary.availableBalance < 0 ? "is-negative" : "is-balance"}`}>
        <div><span>Saldo disponible</span><i><FiDollarSign /></i></div>
        <strong>{money.format(summary.availableBalance)}</strong>
        <small>{summary.availableBalance < 0 ? "Saldo negativo" : "Ingresos menos egresos"}</small>
      </article>
      <article className="expense-summary-card expense-summary-card--income">
        <div><span>Total recaudado</span><i><FiLogIn /></i></div>
        <strong>{money.format(summary.totalIncome)}</strong><small>Ingresos válidos del año</small></article>
      <article className="expense-summary-card expense-summary-card--expense is-expense">
        <div><span>Total de egresos</span><i><FiLogOut /></i></div>
        <strong>-{money.format(summary.totalExpenses)}</strong><small>Solo egresos activos</small></article>
      </>}
    </section>

    <div className="expense-filter-toolbar"><button type="button"
      className="expense-filter-trigger" onClick={() => setFiltersOpen(true)}>
      <FiFilter /> Filtros {activeFilters > 0 && <span>{activeFilters}</span>}</button></div>

    {filtersOpen && <div className="expense-filter-backdrop" onClick={() => setFiltersOpen(false)}>
    <aside className="expenses-filters" aria-label="Filtros de egresos" role="dialog"
      aria-modal="true" onClick={event => event.stopPropagation()}>
      <header><div><FiFilter /><h2>Filtros</h2></div><button type="button"
        aria-label="Cerrar filtros" onClick={() => setFiltersOpen(false)}><FiX /></button></header>
      <label className="expense-filter-search"><span>Buscar</span><input placeholder="Descripción, proveedor o comprobante"
        value={filters.search ?? ""} onChange={(e) => setFilter("search", e.target.value)} /></label>
      <label><span>Año</span><select value={year}
        onChange={(e) => { setYear(Number(e.target.value)); setForm(initialForm(Number(e.target.value))); }}>
        {years.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Mes</span><select value={filters.month ?? ""}
        onChange={(e) => setFilter("month", e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Todos</option>
        {Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>
          {new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(2026, index, 1))}
        </option>)}</select></label>
      <label><span>Desde</span><input type="date" value={filters.dateFrom ?? ""}
        onChange={(e) => setFilter("dateFrom", e.target.value)} /></label>
      <label><span>Hasta</span><input type="date" value={filters.dateTo ?? ""}
        onChange={(e) => setFilter("dateTo", e.target.value)} /></label>
      <label><span>Categoría</span><select value={filters.category ?? ""}
        onChange={(e) => setFilter("category", e.target.value as ExpenseCategory)}>
        <option value="">Todas</option>{EXPENSE_CATEGORIES.map((item) =>
          <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <label><span>Medio</span><select value={filters.paymentMethod ?? ""}
        onChange={(e) => setFilter("paymentMethod", e.target.value as ExpenseFilters["paymentMethod"])}>
        <option value="">Todos</option>{EXPENSE_PAYMENT_METHODS.map((item) =>
          <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <label><span>Registrado por</span><select value={filters.registeredBy ?? ""}
        onChange={(e) => setFilter("registeredBy", e.target.value)}>
        <option value="">Todos</option>{registeredUsers.map((name) =>
          <option key={name}>{name}</option>)}</select></label>
      <label><span>Ordenar</span><select value={filters.sort}
        onChange={(e) => setFilter("sort", e.target.value as ExpenseFilters["sort"])}>
        <option value="DATE_DESC">Fecha más reciente</option><option value="DATE_ASC">Fecha más antigua</option>
        <option value="AMOUNT_DESC">Monto mayor</option><option value="AMOUNT_ASC">Monto menor</option>
        <option value="DESCRIPTION">Descripción</option><option value="CATEGORY">Categoría</option>
      </select></label>
      <footer className="expense-filter-actions"><button type="button"
        className="expense-filter-clear" onClick={() =>
          setFilters({ status: "ACTIVE", sort: "DATE_DESC" })}>
          <FiRefreshCw /> Limpiar filtros</button><button type="button"
        className="expense-filter-apply" onClick={() => setFiltersOpen(false)}>
          <FiCheck /> Ver resultados</button></footer>
    </aside></div>}

    {initialLoading ? <ExpenseCardsSkeleton />
      : items.length === 0 ? <p className="expenses-empty">No hay egresos para los filtros seleccionados.</p>
      : <section className="expenses-grid" aria-label="Listado de egresos">
        {items.map((item) => <article className={`expense-card ${item.status === "CANCELLED" ? "is-cancelled" : ""}`} key={item.id}>
          <header><span><FiMinusCircle aria-hidden="true" /> Egreso</span>
            <b>{item.status === "ACTIVE" ? "Activo" : "Anulado"}</b></header>
          <h2>{item.description}</h2>
          <strong>-{money.format(item.amount)}</strong>
          <footer className="expense-card__footer"><span><FiCalendar /> {item.expenseDate}</span>
            <button type="button" aria-label={`Ver detalle de ${item.description}`}
              title="Ver detalle" onClick={() => setDetail(item)}><FiEye /></button></footer>
        </article>)}
      </section>}

    {formOpen && <div className="expense-modal-overlay">
      <section className="expense-form-modal" role="dialog" aria-modal="true" aria-labelledby="expense-form-title">
        <header><div><span>{editing ? "Corrección auditada" : "Nuevo registro"}</span>
          <h2 id="expense-form-title">{editing ? "Corregir egreso" : "Registrar egreso"}</h2></div>
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)}><FiX /></button></header>
        <form onSubmit={submit}>
          <label className="expense-field-wide"><span>Descripción del egreso *</span>
            <input required maxLength={250} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label><span>Monto *</span><input type="number" min="1" step="1" required
            value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
          <label><span>Fecha del egreso *</span><input type="date" required value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></label>
          <label><span>Categoría *</span><CompactSelect value={form.category}
            placeholder="Seleccionar categoría" options={EXPENSE_CATEGORIES}
            onChange={(value) => value && setForm({ ...form,
              category: value as ExpenseCategory })} /></label>
          <label><span>Medio de pago</span><CompactSelect value={form.paymentMethod ?? ""}
            placeholder="No informado" options={EXPENSE_PAYMENT_METHODS}
            onChange={(value) => setForm({ ...form,
              paymentMethod: value as ExpensePayload["paymentMethod"] || undefined })} /></label>
          <label><span>Responsable o proveedor</span><input maxLength={150} value={form.recipient ?? ""}
            onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></label>
          <label><span>Número de comprobante</span><input maxLength={100} value={form.receiptNumber ?? ""}
            onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></label>
          <label className="expense-field-wide"><span>Observaciones</span><textarea maxLength={1000}
            value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          {editing && <label className="expense-field-wide"><span>Motivo de la corrección *</span>
            <textarea required maxLength={500} value={form.correctionReason ?? ""}
              onChange={(e) => setForm({ ...form, correctionReason: e.target.value })} /></label>}
          <footer><button type="button" onClick={() => setFormOpen(false)}><FiX /> Cancelar</button>
            <button type="submit" disabled={saving}><FiSave />
              {saving ? "Guardando…" : "Guardar egreso"}</button></footer>
        </form>
      </section>
    </div>}

    {detail && <div className="expense-modal-overlay" onMouseDown={(e) =>
      e.target === e.currentTarget && setDetail(null)}>
      <section className="expense-detail-modal" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title">
        <button type="button" aria-label="Cerrar" onClick={() => setDetail(null)}><FiX /></button>
        <span className={`expense-detail-status is-${detail.status.toLowerCase()}`}>
          {detail.status === "ACTIVE" ? "Activo" : "Anulado"}</span>
        <h2 id="expense-detail-title">{detail.description}</h2><strong>-{money.format(detail.amount)}</strong>
        <dl><div><dt><FiCalendar /> Fecha</dt><dd>{detail.expenseDate}</dd></div>
          <div><dt><FiTag /> Categoría</dt><dd>{expenseCategoryLabel(detail.category)}</dd></div>
          <div><dt><FiCreditCard /> Medio de pago</dt><dd>{expensePaymentLabel(detail.paymentMethod)}</dd></div>
          <div><dt><FiBriefcase /> Responsable/proveedor</dt><dd>{detail.recipient || "No informado"}</dd></div>
          <div><dt><FiFileText /> Comprobante</dt><dd>{detail.receiptNumber ||
            (documentsLoading ? "Cargando…" : documents.length === 1
              ? documents[0].originalName
              : documents.length > 1 ? `${documents.length} archivos adjuntos` : "No informado")}</dd></div>
          <div className="expense-detail-wide"><dt><FiMessageSquare /> Observaciones</dt><dd>{detail.notes || "Sin observaciones"}</dd></div>
          <div><dt><FiUser /> Registrado por</dt><dd>{detail.registeredBy}</dd></div>
          <div className="expense-detail-wide"><dt><FiClock /> Fecha de registro</dt><dd>{new Date(detail.createdAt).toLocaleString("es-CL")}</dd></div>
          {detail.cancellationReason && <div className="expense-detail-wide"><dt><FiAlertTriangle /> Motivo de anulación</dt><dd>{detail.cancellationReason}</dd></div>}</dl>
        <section className="expense-documents" aria-label="Documentos adjuntos">
          <h3><FiFileText /> Documentos adjuntos</h3>
          {canManage && <label className={`expense-document-upload ${
            documentsUploading ? "is-loading" : ""}`}>
            {documentsUploading ? <FiLoader className="expense-document-spinner" /> : <FiFilePlus />}
            {documentsUploading ? "Subiendo archivos…" : "Seleccionar archivos"}
            <input type="file" multiple disabled={documentsUploading}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(event) => { void uploadDocuments(event.target.files); event.target.value = ""; }} />
          </label>}
          <small>PDF, Word, Excel o imágenes · Máximo 10 MB por archivo</small>
          {documentsUploading && <p className="expense-document-progress" role="status" aria-live="polite">
            <FiLoader className="expense-document-spinner" /> Guardando en almacenamiento seguro…
          </p>}
          {documentsLoading ? <p className="expense-document-progress" role="status">
            <FiLoader className="expense-document-spinner" /> Cargando documentos…</p>
            : documents.length === 0
            ? <p>Este egreso no tiene documentos.</p>
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
        </section>
        {canManage && detail.status === "ACTIVE" && <footer>
          <button type="button" onClick={() => openEdit(detail)}><FiEdit3 /> Corregir egreso</button>
          <button className="is-danger" type="button" onClick={() => setConfirmCancel(true)}>
            <FiSlash /> Anular egreso</button>
        </footer>}
      </section>
    </div>}

    <ModalConfirm isOpen={confirmSave} title="El egreso supera el saldo disponible"
      message={`Saldo disponible: ${money.format(summary.availableBalance)}. Nuevo egreso: ${money.format(form.amount)}. Saldo resultante: ${money.format(summary.availableBalance - form.amount)}.`}
      confirmLabel="Registrar de todas formas" cancelLabel="Revisar monto" isLoading={saving}
      onCancel={() => setConfirmSave(false)} onConfirm={() => void saveExpense()} />
    <ModalConfirm isOpen={confirmCancel} title="Anular egreso"
      message="El registro seguirá visible, pero dejará de descontarse del saldo disponible."
      confirmLabel="Anular egreso" cancelLabel="Volver" isLoading={saving}
      compact
      cancelIcon={<FiArrowLeft />} confirmIcon={<FiSlash />}
      onCancel={() => { setConfirmCancel(false); setCancelReason(""); }}
      onConfirm={() => void cancelExpense()}>
      <label>Motivo de la anulación<textarea autoFocus maxLength={500}
        value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Ej.: el gasto fue registrado dos veces" /></label>
    </ModalConfirm>
    <ModalAlert isOpen={Boolean(message)} type="success" title="Operación realizada"
      message={message} variant="toast" onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" title="No fue posible completar la acción"
      message={error} onClose={() => setError("")} />
  </main>;
};

const ExpenseCardsSkeleton = () => (
  <section className="expenses-grid" aria-label="Cargando egresos" role="status">
    {Array.from({ length: 6 }, (_, index) => (
      <article className="expense-card expense-card--skeleton" key={index} aria-hidden="true">
        <header><span><FiMinusCircle /> Egreso</span><div className="skeleton-block" /></header>
        <div className="skeleton-block" /><div className="skeleton-block" />
        <div className="expense-details-skeleton">
          {Array.from({ length: 3 }, (_, row) => <div className="skeleton-block" key={row} />)}
        </div>
        <footer className="expense-card__footer"><div className="skeleton-block" />
          <button type="button" className="loading-action-placeholder" disabled
            aria-label="Ver detalle"><FiEye /></button></footer>
      </article>
    ))}
  </section>
);
