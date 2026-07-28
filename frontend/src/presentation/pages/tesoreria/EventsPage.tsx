import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiDollarSign, FiEdit2, FiPlus, FiRefreshCw, FiTrash2,
  FiUsers } from "react-icons/fi";
import type { EventSettlement, SchoolEvent,
  SchoolEventExpense } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./EventsPage.css";

const repository = new TreasuryRepositoryImpl();
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });
const today = new Date().toISOString().slice(0, 10);
const statusLabel: Record<string, string> = {
  BORRADOR: "Borrador", EN_PREPARACION: "En preparación", REALIZADO: "Realizado",
  EN_LIQUIDACION: "En liquidación", CERRADO: "Cerrado", CANCELADO: "Cancelado",
};

const apiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  const data = (error as { response?: { data?: { errors?: Record<string, string> } } })
    .response?.data;
  const messages = data?.errors ? Object.values(data.errors).filter(Boolean) : [];
  return messages.length > 0 ? messages.join(" ") : fallback;
};

export const EventsPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selected, setSelected] = useState<SchoolEvent>();
  const [settlement, setSettlement] = useState<EventSettlement>();
  const [dialog, setDialog] = useState<"event" | "edit" | "expense" | "revenue" | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<SchoolEventExpense>();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repository.listEvents(year);
      setEvents(data);
      setSelected(current => data.find(item => item.id === current?.id) ?? data[0]);
      setFeedback("");
    } catch {
      setFeedback("No fue posible cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  const refreshSelected = (event: SchoolEvent) => {
    setSelected(event);
    setEvents(current => current.map(item => item.id === event.id ? event : item));
    setSettlement(undefined);
    setDialog(null);
  };

  const calculate = async () => {
    if (!selected) return;
    try {
      setSettlement(await repository.calculateEvent(selected.id));
      setFeedback("");
    } catch (error) {
      setFeedback(apiErrorMessage(error,
        "Registra una recaudación válida antes de calcular la distribución."));
    }
  };

  const confirm = async () => {
    if (!selected) return;
    try {
      refreshSelected(await repository.confirmEvent(selected.id));
      setFeedback("Liquidación confirmada y transferencias registradas.");
    } catch (error) {
      setFeedback(apiErrorMessage(error,
        "Debes resolver remanentes o saldos negativos antes de confirmar."));
    }
  };

  const cancelSettlement = async () => {
    if (!selected) return;
    try {
      refreshSelected(await repository.cancelEventSettlement(selected.id));
      setFeedback("Liquidación cancelada. El evento volvió a estar en liquidación.");
    } catch (error) {
      setFeedback(apiErrorMessage(error, "No fue posible cancelar la liquidación."));
    }
  };

  return (
    <main className="events-page">
      <header className="events-header">
        <div><span>Tesorería / Eventos</span><h1>Eventos escolares</h1>
          <p>Administra la recaudación y distribución de la Fiesta de la Familia.</p></div>
        <button onClick={() => setDialog("event")}><FiPlus /> Crear evento</button>
      </header>

      <div className="events-toolbar">
        <label>Año escolar<input type="number" value={year}
          onChange={event => setYear(Number(event.target.value))} /></label>
        <button aria-label="Actualizar eventos" onClick={() => void load()}><FiRefreshCw /></button>
      </div>
      {feedback && <p className="events-feedback" role="status">{feedback}</p>}

      {loading ? <EventsSkeleton /> : events.length === 0
        ? <section className="events-empty"><FiCalendar /><h2>No hay eventos en {year}</h2>
            <p>Crea la edición anual y configura sus cursos y stands.</p></section>
        : <div className="events-layout">
          <aside className="event-list" aria-label="Eventos">
            {events.map(event => <button className={selected?.id === event.id ? "active" : ""}
              key={event.id} onClick={() => { setSelected(event); setSettlement(undefined); }}>
              <strong>{event.name}</strong><span>{event.schoolYear} · {statusLabel[event.status]}</span>
            </button>)}
          </aside>
          {selected && <EventDetail event={selected} settlement={settlement}
            onExpense={() => setDialog("expense")} onRevenue={() => setDialog("revenue")}
            onEdit={() => setDialog("edit")}
            onEditExpense={expense => { setExpenseToEdit(expense); setDialog("expense"); }}
            onDeleteExpense={async expense => {
              refreshSelected(await repository.deleteEventExpense(selected.id, expense.key));
              setFeedback("Gasto eliminado definitivamente.");
            }}
            onDeleted={() => {
              setEvents(current => current.filter(item => item.id !== selected.id));
              setSelected(undefined);
            }}
            onCalculate={() => void calculate()} onConfirm={() => void confirm()}
            onCancelSettlement={() => void cancelSettlement()} />}
        </div>}

      {dialog === "event" && <EventForm year={year} onClose={() => setDialog(null)}
        onSaved={event => { setEvents(current => [event, ...current]); setSelected(event);
          setDialog(null); }} />}
      {dialog === "edit" && selected && <EventForm year={year} event={selected}
        onClose={() => setDialog(null)} onSaved={refreshSelected} />}
      {dialog === "expense" && selected && <ExpenseForm event={selected} expense={expenseToEdit}
        onClose={() => { setDialog(null); setExpenseToEdit(undefined); }}
        onSaved={event => { setExpenseToEdit(undefined); refreshSelected(event); }} />}
      {dialog === "revenue" && selected && <RevenueForm event={selected}
        onClose={() => setDialog(null)} onSaved={refreshSelected} />}
    </main>
  );
};

const EventsSkeleton = () => <div className="events-skeleton" role="status" aria-label="Cargando eventos">
  <aside className="events-skeleton-list">
    {Array.from({ length: 3 }, (_, index) => <div className="events-skeleton-card" key={index}>
      <div className="skeleton-block" /><div className="skeleton-block" />
    </div>)}
  </aside>
  <section className="events-skeleton-content">
    <article className="events-skeleton-summary">
      <div><div className="skeleton-block" /><div className="skeleton-block" /></div>
      <div className="skeleton-block" />
    </article>
    <div className="events-skeleton-metrics">
      {Array.from({ length: 5 }, (_, index) => <div className="skeleton-block" key={index} />)}
    </div>
    <div className="skeleton-block events-skeleton-title" />
    <div className="events-skeleton-courses">
      {Array.from({ length: 3 }, (_, index) => <article className="events-skeleton-course" key={index}>
        <div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" />
      </article>)}
    </div>
  </section>
</div>;

const EventDetail = ({ event, settlement, onExpense, onRevenue, onEdit, onDeleted,
  onCalculate, onConfirm, onCancelSettlement, onEditExpense, onDeleteExpense }: {
  event: SchoolEvent; settlement?: EventSettlement; onExpense: () => void; onRevenue: () => void;
  onEdit: () => void; onDeleted: () => void; onCalculate: () => void; onConfirm: () => void;
  onCancelSettlement: () => void;
  onEditExpense: (expense: SchoolEventExpense) => void;
  onDeleteExpense: (expense: SchoolEventExpense) => Promise<void>;
}) => {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const closed = event.status === "CERRADO" || event.status === "CANCELADO";
  return <section className="event-detail">
    <article className="event-summary">
      <header><div><span>{statusLabel[event.status]}</span><h2>{event.name} {event.schoolYear}</h2>
        <p><FiCalendar /> {event.eventDate} · <FiUsers /> {event.participants.length} cursos</p></div>
        <div className="event-actions">
          {!closed && <><button onClick={onExpense}>Registrar gasto</button>
          <button onClick={onRevenue}>Registrar recaudación</button>
          <button onClick={onEdit}><FiEdit2 /> Editar</button></>}
          {closed && <button className={cancelArmed ? "danger" : ""} onClick={() => {
            if (!cancelArmed) { setCancelArmed(true); return; }
            onCancelSettlement();
          }}>{cancelArmed ? "Confirmar cancelación" : "Cancelar liquidación"}</button>}
          {!closed && <>
          <button className={deleteArmed ? "danger" : ""} onClick={async () => {
            if (!deleteArmed) { setDeleteArmed(true); return; }
            await repository.deleteEvent(event.id);
            onDeleted();
          }}><FiTrash2 /> {deleteArmed ? "Confirmar eliminación" : "Eliminar evento"}</button>
          {deleteArmed && <button type="button" onClick={() => setDeleteArmed(false)}>Cancelar</button>}</>}
          {cancelArmed && <button type="button" onClick={() => setCancelArmed(false)}>Volver</button>}
        </div></header>
      <div className="event-metrics">
        <Metric label="Recaudación bruta" value={event.grossRevenue ?? 0} />
        <Metric label="Gastos comunes" value={-event.commonExpenses} negative />
        <Metric label="Gastos de cursos" value={-event.courseExpenses} negative />
        <Metric label="Ganancia neta total" value={event.netProfit} />
        <Metric label="Remanente" value={event.remainder ?? 0} />
      </div>
      <p><strong>Stand:</strong> {event.participants[0]?.standName}</p>
    </article>
    <div className="event-section-title"><h2>Distribución por curso</h2>
      {!closed && <button onClick={onCalculate}>Calcular distribución</button>}</div>
    <div className="course-grid">{event.participants.map(participant => {
      const preview = settlement?.courses.find(item => item.course === participant.course);
      const net = preview?.netProfit ?? participant.netProfit;
      return <article className={net != null && net < 0 ? "course-card warning" : "course-card"}
        key={participant.course}><header><div><h3>{participant.course}</h3></div>
          <span>{participant.transferStatus === "TRANSFERRED" ? "Transferida" :
            participant.transferStatus === "REQUIRES_RESOLUTION" ? "Requiere resolución" :
            "Pendiente"}</span></header>
        <dl><div><dt>Monto a recibir sin descontar gastos</dt>
          <dd>{money.format(preview?.grossShare ?? participant.grossShare ?? 0)}</dd></div>
          <div><dt>Gasto registrado por el curso</dt>
          <dd className="negative">-{money.format(preview?.expenses ??
            participant.ownExpenses ?? 0)}</dd></div><div><dt>Neto por curso</dt>
          <dd>{money.format(net ?? 0)}</dd></div></dl></article>;
    })}</div>
    {settlement && <article className="settlement-preview"><h2>Vista previa de liquidación</h2>
      <p>Ganancia neta después de descontar todos los gastos: 
        <strong>{money.format(settlement.distributable)}</strong></p>
      {settlement.remainder > 0 && <p className="settlement-warning">Margen que queda en tesorería:
        {money.format(settlement.remainder)}</p>}
      <button disabled={settlement.courses.some(item => item.netProfit < 0)} onClick={onConfirm}>
        Confirmar liquidación y transferir</button></article>}
    <section><h2>Gastos registrados</h2><div className="expense-grid">
      {event.expenses.map(expense => <EventExpenseCard key={expense.key} expense={expense}
        editable={!closed} onEdit={() => onEditExpense(expense)}
        onDelete={() => onDeleteExpense(expense)} />)}</div></section>
  </section>;
};

const EventExpenseCard = ({ expense, editable, onEdit, onDelete }: {
  expense: SchoolEventExpense; editable: boolean; onEdit: () => void;
  onDelete: () => Promise<void>;
}) => {
  const [deleteArmed, setDeleteArmed] = useState(false);
  return <article className="event-expense">
    <header><strong>{expense.description}</strong><span>{expense.status === "ACTIVE"
      ? "Activo" : "Anulado"}</span></header><b>-{money.format(expense.amount)}</b>
    <p>{expense.type === "COMMON" ? "Gasto común" : `Curso: ${expense.course}`}</p>
    <small>{expense.date} · {expense.category || "Sin categoría"} · {expense.registeredBy}</small>
    {editable && expense.status === "ACTIVE" && <footer className="event-actions">
      <button type="button" onClick={onEdit}><FiEdit2 /> Editar</button>
      <button type="button" className={deleteArmed ? "danger" : ""} onClick={async () => {
        if (!deleteArmed) { setDeleteArmed(true); return; }
        await onDelete();
      }}><FiTrash2 /> {deleteArmed ? "Confirmar eliminación" : "Eliminar"}</button>
      {deleteArmed && <button type="button" onClick={() => setDeleteArmed(false)}>Cancelar</button>}
    </footer>}
  </article>;
};

const Metric = ({ label, value, negative = false }: { label: string; value: number;
  negative?: boolean }) => <div><span>{label}</span><strong className={negative ? "negative" : ""}>
    {money.format(value)}</strong></div>;

const EventForm = ({ year, event, onClose, onSaved }: { year: number; event?: SchoolEvent;
  onClose: () => void; onSaved: (event: SchoolEvent) => void }) => {
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: event?.name ?? "Fiesta de la Familia",
    schoolYear: event?.schoolYear ?? year, eventDate: event?.eventDate ?? today,
    description: event?.description ?? "", standName: event?.participants[0]?.standName ?? "",
    courses: event?.participants.map(item => ({
      course: item.course, standType: item.standType ?? "",
    })) ?? [
      { course: "", standType: "" },
      { course: "", standType: "" },
      { course: "", standType: "" },
    ] });
  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    const { courses, standName, ...eventFields } = form;
    const payload = { ...eventFields, participants: courses.filter(item => item.course)
      .map(item => ({ ...item, course: item.course.toUpperCase(), standName })) };
    try {
      setError("");
      onSaved(await (event ? repository.updateEvent(event.id, payload)
        : repository.createEvent(payload)));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "No fue posible guardar el evento."));
    }
  };
  return <Modal title={event ? "Editar evento" : "Crear evento"} onClose={onClose}>
    <form onSubmit={submit}>
    <label>Nombre<input required value={form.name}
      onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <div className="form-row"><label>Año<input required type="number" value={form.schoolYear}
      onChange={e => setForm({ ...form, schoolYear: Number(e.target.value) })} /></label>
      <label>Fecha<input required type="date" value={form.eventDate}
        onChange={e => setForm({ ...form, eventDate: e.target.value })} /></label></div>
    <label>Descripción<textarea value={form.description}
      onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    <label>Nombre del stand<input required value={form.standName}
      onChange={e => setForm({ ...form, standName: e.target.value })} /></label>
    <fieldset><legend>Cursos participantes</legend>{form.courses.map((course, index) =>
      <div key={index}><input aria-label={`Curso ${index + 1}`}
        placeholder="Curso" required value={course.course} onChange={e => {
          const courses = [...form.courses];
          courses[index] = { ...course, course: e.target.value.toUpperCase() };
          setForm({ ...form, courses }); }} /></div>)}</fieldset>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}>Cancelar</button>
      <button type="submit">{event ? "Guardar cambios" : "Crear evento"}</button>
    </footer></form></Modal>;
};

const ExpenseForm = ({ event, expense, onClose, onSaved }: { event: SchoolEvent;
  expense?: SchoolEventExpense; onClose: () => void; onSaved: (event: SchoolEvent) => void }) => {
  const [error, setError] = useState("");
  const [form, setForm] = useState({ description: expense?.description ?? "",
    amount: expense?.amount ?? 0, date: expense?.date ?? today,
    type: expense?.type ?? "COMMON" as "COMMON" | "COURSE", course: expense?.course ?? "",
    category: expense?.category ?? "", responsible: expense?.responsible ?? "",
    paymentMethod: expense?.paymentMethod ?? "CASH" });
  return <Modal title={expense ? "Editar gasto" : "Registrar gasto"} onClose={onClose}>
    <form onSubmit={async e => {
    e.preventDefault();
    try {
      setError("");
      onSaved(await (expense ? repository.updateEventExpense(event.id, expense.key, form)
        : repository.addEventExpense(event.id, form)));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "No fue posible guardar el gasto."));
    }
  }}>
    <label>Descripción<input required value={form.description}
      onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    <div className="form-row"><label>Monto<input required min="1" type="number"
      onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></label>
      <label>Fecha<input required type="date" value={form.date}
        onChange={e => setForm({ ...form, date: e.target.value })} /></label></div>
    <label>Tipo<select value={form.type} onChange={e => setForm({ ...form,
      type: e.target.value as "COMMON" | "COURSE", course: "" })}>
      <option value="COMMON">Gasto común</option><option value="COURSE">Gasto de curso</option>
    </select></label>{form.type === "COURSE" && <label>Curso<select required value={form.course}
      onChange={e => setForm({ ...form, course: e.target.value })}><option value="">Seleccionar</option>
      {event.participants.map(item => <option key={item.course}>{item.course}</option>)}</select></label>}
    <label>Categoría<input value={form.category}
      onChange={e => setForm({ ...form, category: e.target.value })} /></label>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}>Cancelar</button>
      <button type="submit">{expense ? "Guardar cambios" : "Registrar gasto"}</button>
    </footer></form></Modal>;
};

const RevenueForm = ({ event, onClose, onSaved }: { event: SchoolEvent; onClose: () => void;
  onSaved: (event: SchoolEvent) => void }) => {
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(event.grossRevenue?.toString() ?? "");
  const payload = useMemo(() => ({ amount: Number(amount), date: today,
    description: `Recaudación total ${event.name} ${event.schoolYear}`, paymentMethod: "CASH" }),
    [amount, event]);
  return <Modal title="Registrar recaudación" onClose={onClose}><form onSubmit={async e => {
    e.preventDefault();
    try { setError(""); onSaved(await repository.registerEventRevenue(event.id, payload)); }
    catch (requestError) {
      setError(apiErrorMessage(requestError, "No fue posible guardar la recaudación."));
    }
  }}>
    <label>Monto total recaudado<input autoFocus required min="1" type="number"
      inputMode="numeric" placeholder="0" value={amount}
      onChange={e => setAmount(e.target.value)} /></label>
    <p>La recaudación se dividirá por la cantidad real de cursos participantes.</p>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}>Cancelar</button>
      <button type="submit"><FiDollarSign /> Guardar recaudación</button></footer></form></Modal>;
};

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void;
  children: React.ReactNode }) => <div className="event-modal" role="presentation"
    onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
      <header><h2 id="event-dialog-title">{title}</h2>
        <button aria-label="Cerrar" onClick={onClose}>×</button></header>{children}</section></div>;
