import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FiCalendar, FiEye, FiMinusCircle, FiPlus, FiX } from "react-icons/fi";
import type {
  ExpenseCategory, ExpenseFilters, ExpensePayload,
  FinancialSummary, TreasuryExpense,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import {
  EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS,
  expenseCategoryLabel, expensePaymentLabel,
} from "@/shared/constants/ExpenseConstants";
import "./ExpensesPage.css";

const repository = new TreasuryRepositoryImpl();
const years = Array.from({ length: 10 }, (_, index) => 2026 + index);
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const emptySummary: FinancialSummary = {
  schoolYear: 2026, feeIncome: 0, otherIncome: 0,
  totalIncome: 0, totalExpenses: 0, availableBalance: 0,
};
const today = new Date().toISOString().slice(0, 10);
const initialForm = (year: number): ExpensePayload => ({
  schoolYear: year, description: "", amount: 0, expenseDate: today,
  category: "MATERIALS",
});

export const ExpensesPage = () => {
  const { user } = useAuth();
  const canManage = user?.rol === "ADMIN";
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
  const [editing, setEditing] = useState<TreasuryExpense | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setLoading(false);
    }
  }, [year, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

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
        <span>Tesorería del curso</span>
        <h1>Egresos</h1>
        <p>Pagos realizados por Tesorería.</p>
      </div>
      {canManage && <button type="button" onClick={openCreate}>
        <FiPlus aria-hidden="true" /> Registrar egreso
      </button>}
    </header>

    <section className="expenses-summary" aria-label="Resumen financiero">
      <article><span>Total recaudado</span><strong>{money.format(summary.totalIncome)}</strong>
        <small>Ingresos válidos del año</small></article>
      <article className="is-expense"><span>Total de egresos</span>
        <strong>-{money.format(summary.totalExpenses)}</strong><small>Solo egresos activos</small></article>
      <article className={summary.availableBalance < 0 ? "is-negative" : "is-balance"}>
        <span>Saldo disponible</span><strong>{money.format(summary.availableBalance)}</strong>
        <small>{summary.availableBalance < 0 ? "Saldo negativo" : "Ingresos menos egresos"}</small>
      </article>
    </section>

    <section className="expenses-filters" aria-label="Filtros de egresos">
      <label><span>Buscar</span><input placeholder="Descripción, proveedor o comprobante"
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
    </section>

    {loading ? <p className="expenses-empty">Cargando egresos…</p>
      : items.length === 0 ? <p className="expenses-empty">No hay egresos para los filtros seleccionados.</p>
      : <section className="expenses-grid" aria-label="Listado de egresos">
        {items.map((item) => <article className={`expense-card ${item.status === "CANCELLED" ? "is-cancelled" : ""}`} key={item.id}>
          <header><span><FiMinusCircle aria-hidden="true" /> Egreso</span>
            <b>{item.status === "ACTIVE" ? "Activo" : "Anulado"}</b></header>
          <h2>{item.description}</h2>
          <strong>-{money.format(item.amount)}</strong>
          <dl><div><dt>Categoría</dt><dd>{expenseCategoryLabel(item.category)}</dd></div>
            <div><dt><FiCalendar aria-hidden="true" /> Fecha</dt><dd>{item.expenseDate}</dd></div>
            <div><dt>Registrado por</dt><dd>{item.registeredBy}</dd></div></dl>
          <button type="button" onClick={() => setDetail(item)}><FiEye /> Ver detalle</button>
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
          <label><span>Categoría *</span><select value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
            {EXPENSE_CATEGORIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select></label>
          <label><span>Medio de pago</span><select value={form.paymentMethod ?? ""}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as ExpensePayload["paymentMethod"] || undefined })}>
            <option value="">No informado</option>{EXPENSE_PAYMENT_METHODS.map((item) =>
              <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label><span>Responsable o proveedor</span><input maxLength={150} value={form.recipient ?? ""}
            onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></label>
          <label><span>Número de comprobante</span><input maxLength={100} value={form.receiptNumber ?? ""}
            onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></label>
          <label className="expense-field-wide"><span>Observaciones</span><textarea maxLength={1000}
            value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          {editing && <label className="expense-field-wide"><span>Motivo de la corrección *</span>
            <textarea required maxLength={500} value={form.correctionReason ?? ""}
              onChange={(e) => setForm({ ...form, correctionReason: e.target.value })} /></label>}
          <footer><button type="button" onClick={() => setFormOpen(false)}>Cancelar</button>
            <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar egreso"}</button></footer>
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
        <dl><div><dt>Fecha</dt><dd>{detail.expenseDate}</dd></div>
          <div><dt>Categoría</dt><dd>{expenseCategoryLabel(detail.category)}</dd></div>
          <div><dt>Medio de pago</dt><dd>{expensePaymentLabel(detail.paymentMethod)}</dd></div>
          <div><dt>Responsable/proveedor</dt><dd>{detail.recipient || "No informado"}</dd></div>
          <div><dt>Comprobante</dt><dd>{detail.receiptNumber || "No informado"}</dd></div>
          <div><dt>Observaciones</dt><dd>{detail.notes || "Sin observaciones"}</dd></div>
          <div><dt>Registrado por</dt><dd>{detail.registeredBy}</dd></div>
          <div><dt>Fecha de registro</dt><dd>{new Date(detail.createdAt).toLocaleString("es-CL")}</dd></div>
          {detail.cancellationReason && <div><dt>Motivo de anulación</dt><dd>{detail.cancellationReason}</dd></div>}</dl>
        {canManage && detail.status === "ACTIVE" && <footer>
          <button type="button" onClick={() => openEdit(detail)}>Corregir egreso</button>
          <button className="is-danger" type="button" onClick={() => setConfirmCancel(true)}>Anular egreso</button>
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
      onCancel={() => { setConfirmCancel(false); setCancelReason(""); }}
      onConfirm={() => void cancelExpense()}>
      <label>Motivo de la anulación<textarea autoFocus maxLength={500}
        value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Ej.: el gasto fue registrado dos veces" /></label>
    </ModalConfirm>
    <ModalAlert isOpen={Boolean(message)} type="success" title="Operación realizada"
      message={message} onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" title="No fue posible completar la acción"
      message={error} onClose={() => setError("")} />
  </main>;
};
