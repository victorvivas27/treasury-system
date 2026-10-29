import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { useDialogFocus } from "@/shared/ui/dialog/useDialogFocus";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiBriefcase, FiCalendar, FiCheck, FiClock,
  FiCreditCard, FiDollarSign, FiDownload, FiEdit3, FiEye, FiFilePlus, FiFileText, FiFilter, FiLogIn,
  FiLoader, FiLogOut, FiMessageSquare, FiPlus, FiRefreshCw, FiSave,
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
import { MovementSummarySkeleton, MovementListSkeleton } from "@/shared/ui/skeleton/DataSkeletons";
import { getExpensesResource, expensesSelection } from "./expensesCache";
import { useDashboardResource } from "../dashboard/dashboardCache";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import { chileDate } from "@/shared/date/chileDateTime";
import {
  EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS,
  expenseCategoryLabel, expensePaymentLabel,
} from "@/shared/constants/ExpenseConstants";
import "./ExpensesPage.css";
import "./ExpensesResponsive.css";
import "./TreasuryMovementFilters.css";
import { MovementFilterSelect } from "./MovementFilterSelect";

const repository = new TreasuryRepositoryImpl();
const EXPENSE_PAGE_SIZE = 3;
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
  const [searchParams] = useSearchParams();
  const selection = expensesSelection(user?.id, canManage);
  const [year, setYear] = useState(() => {
    const requestedYear = Number(searchParams.get("year"));
    return years.includes(requestedYear) ? requestedYear : selection.year;
  });
  const [filters, setFilters] = useState<ExpenseFilters>(selection.filters);
  const resource = getExpensesResource(user?.id, canManage, year, filters);
  const cached = useDashboardResource(resource);
  const items = cached.data?.items ?? [];
  const summary = cached.data?.summary ?? emptySummary;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / EXPENSE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleExpenses = items.slice((currentPage - 1) * EXPENSE_PAGE_SIZE, currentPage * EXPENSE_PAGE_SIZE);
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    !["status", "sort"].includes(key) && value !== undefined && value !== "").length;
  const initialLoading = !cached.data && !cached.error;
  const load = useCallback(() => resource.load(true), [resource]);
  useEffect(() => { Object.assign(selection, { year, filters }); }, [selection, year, filters]);
  useEffect(() => { setPage(1); }, [resource]);

  const formDialog = useDialogFocus(formOpen, () => setFormOpen(false), saving || documentsUploading || confirmCancel || confirmSave);
  const detailDialog = useDialogFocus(Boolean(detail), () => setDetail(null), saving || documentsUploading || confirmCancel || confirmSave);
  const filterDialog = useDialogFocus(filtersOpen, () => setFiltersOpen(false));

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

  return <>
    <main className="expenses-page outgoings-page" aria-busy={initialLoading}>
    {cached.error && <div role="alert">
      <p>No fue posible cargar los egresos. Intenta nuevamente.</p>
      <button type="button" onClick={() => void load()}>Reintentar</button>
    </div>}
    <header className="expenses-header">
      <div>
        <h1>Egresos</h1>
      </div>
      {canManage && <button type="button" onClick={openCreate}>
        <FiPlus aria-hidden="true" /> Registrar egreso
      </button>}
    </header>

    {initialLoading && <MovementSummarySkeleton />}
    {cached.data ? (
    <section className="expenses-summary" aria-label="Resumen financiero">
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
    </section>
    ) : !initialLoading && <p role="status">Resumen financiero no disponible.</p>}

    <div className="expense-filter-toolbar"><button type="button"
      className="expense-filter-trigger" aria-haspopup="dialog" aria-controls="expense-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
      <FiFilter /> Filtros {activeFilters > 0 && <span>{activeFilters}</span>}</button></div>

    {filtersOpen && <div className="expense-filter-backdrop movement-filter-backdrop" onClick={() => setFiltersOpen(false)}>
    <aside id="expense-filters" className="expenses-filters" aria-label="Filtros de egresos" role="dialog"
      ref={filterDialog} tabIndex={-1} aria-modal="true" onClick={event => event.stopPropagation()}>
      <header><div><FiFilter /><h2>Filtros</h2></div><button type="button"
        aria-label="Cerrar filtros" onClick={() => setFiltersOpen(false)}><FiX /></button></header>
      <label className="expense-filter-search movement-filter-search"><span>Buscar</span><input placeholder="Descripción, proveedor o comprobante"
        value={filters.search ?? ""} onChange={(e) => setFilter("search", e.target.value)} /></label>
      <MovementFilterSelect label="Año" value={String(year)}
        options={years.map(item => ({ value: String(item), label: String(item) }))}
        onChange={value => { setYear(Number(value)); setForm(initialForm(Number(value))); }} />
      <MovementFilterSelect label="Mes" value={String(filters.month ?? "")} placeholder="Todos"
        options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1),
          label: new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(2026, index, 1)) }))}
        onChange={value => setFilter("month", value ? Number(value) : undefined)} />
      <label><span>Desde</span><input type="date" value={filters.dateFrom ?? ""}
        onChange={(e) => setFilter("dateFrom", e.target.value)} /></label>
      <label><span>Hasta</span><input type="date" value={filters.dateTo ?? ""}
        onChange={(e) => setFilter("dateTo", e.target.value)} /></label>
      <MovementFilterSelect label="Categoría" value={filters.category ?? ""} placeholder="Todas"
        options={EXPENSE_CATEGORIES} onChange={value => setFilter("category", value as ExpenseCategory)} />
      <MovementFilterSelect label="Medio" value={filters.paymentMethod ?? ""} placeholder="Todos"
        options={EXPENSE_PAYMENT_METHODS} onChange={value => setFilter("paymentMethod", value as ExpenseFilters["paymentMethod"])} />
      <MovementFilterSelect label="Registrado por" value={filters.registeredBy ?? ""} placeholder="Todos"
        options={registeredUsers.map(name => ({ value: name, label: name }))}
        onChange={value => setFilter("registeredBy", value)} />
      <MovementFilterSelect label="Ordenar" value={filters.sort ?? "DATE_DESC"}
        options={[
          { value: "DATE_DESC", label: "Fecha más reciente" }, { value: "DATE_ASC", label: "Fecha más antigua" },
          { value: "AMOUNT_DESC", label: "Monto mayor" }, { value: "AMOUNT_ASC", label: "Monto menor" },
          { value: "DESCRIPTION", label: "Descripción" }, { value: "CATEGORY", label: "Categoría" },
        ]} onChange={value => setFilter("sort", value as ExpenseFilters["sort"])} />
      <footer className="expense-filter-actions movement-filter-actions"><button type="button"
        className="expense-filter-clear movement-filter-clear" onClick={() =>
          setFilters({ status: "ACTIVE", sort: "DATE_DESC" })}>
          <FiRefreshCw /> Limpiar filtros</button><button type="button"
        className="expense-filter-apply movement-filter-apply" onClick={() => setFiltersOpen(false)}>
          <FiCheck /> Ver resultados</button></footer>
    </aside></div>}

    {initialLoading && <MovementListSkeleton />}
    {!initialLoading && !cached.error && items.length === 0 ? <p className="expenses-empty">No hay egresos para los filtros seleccionados.</p>
      : cached.data ? <section className="expenses-grid expense-results" aria-label="Listado de egresos">
        <span className="expense-results__count">{items.length} egresos</span>
        {visibleExpenses.map((item) => <article className={`expense-card ${item.status === "CANCELLED" ? "is-cancelled" : ""}`} key={item.id}>
          <header><span><FiCalendar aria-hidden="true" /> {item.expenseDate}</span>
            {item.status === "CANCELLED" && <b>Anulado</b>}</header>
          <h2>{item.description}</h2>
          <strong>-{money.format(item.amount)}</strong>
          <footer className="expense-card__footer">
            <button type="button" aria-label={`Ver detalle de ${item.description}`}
              title="Ver detalle" onClick={() => setDetail(item)}><FiEye /></button></footer>
        </article>)}
        {Array.from({ length: EXPENSE_PAGE_SIZE - visibleExpenses.length }, (_, index) =>
          <div className="expense-card-placeholder" key={`empty-${index}`} aria-hidden="true" />)}
        {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages}
          hasPrevious={currentPage > 1} hasNext={currentPage < totalPages}
          onPrevious={() => setPage(Math.max(1, currentPage - 1))}
          onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
          ariaLabel="Paginación de egresos" />}
      </section> : null}

    {formOpen && <div className="expense-modal-overlay">
      <section ref={formDialog} tabIndex={-1} className="expense-form-modal" role="dialog" aria-modal="true" aria-labelledby="expense-form-title">
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
      <section className="expense-detail-modal" role="dialog" aria-modal="true" ref={detailDialog} tabIndex={-1} aria-labelledby="expense-detail-title">
        <button type="button" aria-label="Cerrar" onClick={() => setDetail(null)}><FiX /></button>
        {detail.status === "CANCELLED" && <span className="expense-detail-status is-cancelled">Anulado</span>}
        <h2 id="expense-detail-title">{detail.description}</h2><strong>-{money.format(detail.amount)}</strong>
          {canManage && <label className={`expense-document-upload ${
            documentsUploading ? "is-loading" : ""}`}>
            {documentsUploading ? <FiLoader className="expense-document-spinner" /> : <FiFilePlus />}
            {documentsUploading ? "Subiendo archivos…" : "Adjuntar comprobante"}
            <input type="file" multiple disabled={documentsUploading}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(event) => { void uploadDocuments(event.target.files); event.target.value = ""; }} />
          </label>}
        <dl><div><dt><FiCalendar /> Fecha</dt><dd>{detail.expenseDate}</dd></div>
          <div><dt><FiTag /> Categoría</dt><dd>{expenseCategoryLabel(detail.category)}</dd></div>
          {detail.paymentMethod && <div><dt><FiCreditCard /> Medio de pago</dt><dd>{expensePaymentLabel(detail.paymentMethod)}</dd></div>}
          {detail.recipient && <div><dt><FiBriefcase /> Responsable/proveedor</dt><dd>{detail.recipient}</dd></div>}
          {detail.receiptNumber && <div><dt><FiFileText /> Comprobante</dt><dd>{detail.receiptNumber}</dd></div>}
          {detail.notes && <div className="expense-detail-wide"><dt><FiMessageSquare /> Observaciones</dt><dd>{detail.notes}</dd></div>}
          <div><dt><FiUser /> Registrado por</dt><dd>{detail.registeredBy}</dd></div>
          <div className="expense-detail-wide"><dt><FiClock /> Fecha de registro</dt><dd>{new Date(detail.createdAt).toLocaleString("es-CL")}</dd></div>
          {detail.cancellationReason && <div className="expense-detail-wide"><dt><FiAlertTriangle /> Motivo de anulación</dt><dd>{detail.cancellationReason}</dd></div>}</dl>
        {(documentsLoading || documentsUploading || documents.length > 0) && <section className="expense-documents" aria-label="Documentos adjuntos">
          <h3><FiFileText /> Documentos adjuntos</h3>

          {canManage && <small>PDF, Word, Excel o imágenes · Hasta 10 MB</small>}
          {documentsUploading && <p className="expense-document-progress" role="status" aria-live="polite">
            <FiLoader className="expense-document-spinner" /> Guardando en almacenamiento seguro…
          </p>}
          {documentsLoading ? <div className="expense-document-progress" role="status" aria-label="Cargando documentos"><Skeleton /><Skeleton width="65%" /></div>
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
        </section>}
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
  </main></>;
};
