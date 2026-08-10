import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiDollarSign, FiEdit2, FiMinusCircle, FiPlus,
  FiRefreshCw, FiTrash2,
  FiTrendingUp, FiUsers, FiX } from "react-icons/fi";
import type { EventSettlement, SchoolEvent,
  SchoolEventExpense } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./EventsPage.css";

const repository = new TreasuryRepositoryImpl();
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });
const today = new Date().toISOString().slice(0, 10);
const schoolYears = Array.from({ length: 10 }, (_, index) => 2026 + index);
const EVENTS_PAGE_SIZE = 2;
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

const anchorForCard = (card: DOMRect, width: number, height: number) => ({
  top: Math.max(12, Math.min(card.top, window.innerHeight - height - 12) - 100),
  left: Math.max(12, Math.min(card.left, window.innerWidth - width - 12)),
});

export const EventsPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [yearOpen, setYearOpen] = useState(false);
  const [eventPage, setEventPage] = useState(1);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selected, setSelected] = useState<SchoolEvent>();
  const [settlement, setSettlement] = useState<EventSettlement>();
  const [dialog, setDialog] = useState<"event" | "edit" | "expense" | "revenue" | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<SchoolEventExpense>();
  const [expenseAnchor, setExpenseAnchor] = useState<{ top: number; left: number }>();
  const [dialogAnchor, setDialogAnchor] = useState<{ top: number; left: number }>();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [managedCourse, setManagedCourse] = useState("");

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
      setHasLoaded(true);
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setEventPage(1); }, [year]);

  const eventPages = Math.max(1, Math.ceil(events.length / EVENTS_PAGE_SIZE));
  const visibleEvents = events.slice((eventPage - 1) * EVENTS_PAGE_SIZE,
    eventPage * EVENTS_PAGE_SIZE);
  useEffect(() => {
    if (eventPage > eventPages) setEventPage(eventPages);
  }, [eventPage, eventPages]);
  const changeEventPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, eventPages));
    setEventPage(nextPage);
    setSelected(events[(nextPage - 1) * EVENTS_PAGE_SIZE]);
    setSettlement(undefined);
  };

  useEffect(() => {
    repository.getManagedCourse()
      .then(setManagedCourse)
      .catch(() => setFeedback("No fue posible cargar el curso administrado."));
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
        <div><h1>Eventos escolares</h1>
          <p>Administra la recaudación y distribución de la Fiesta de la Familia.</p></div>
        <div className="events-header__actions">
          <button onClick={event => {
            setDialogAnchor(anchorForCard(event.currentTarget.getBoundingClientRect(), 320, 430));
            setDialog("event");
          }}><FiPlus /> Crear evento</button>
          <button aria-label="Actualizar eventos" title="Actualizar eventos"
            onClick={() => void load()}><FiRefreshCw /> Recargar</button>
        </div>
      </header>

      <div className="events-toolbar">
        <div className="events-year-select">
          <span>Año escolar</span>
          <button type="button" aria-label="Año escolar" aria-haspopup="listbox"
            aria-expanded={yearOpen} onClick={() => setYearOpen(current => !current)}>
            {year}<span aria-hidden="true">⌄</span>
          </button>
          {yearOpen && <div className="events-year-select__menu" role="listbox"
            aria-label="Año escolar">
            {schoolYears.map(item => <button type="button" role="option" value={item}
              aria-selected={item === year} key={item} onClick={() => {
                setYear(item);
                setYearOpen(false);
              }}>{item}</button>)}
          </div>}
        </div>
      </div>
      {feedback && <p className="events-feedback" role="status">{feedback}</p>}

      {loading && !hasLoaded ? <EventsSkeleton /> : events.length === 0
        ? <section className="events-empty"><FiCalendar /><h2>No hay eventos en {year}</h2>
            <p>Crea la edición anual y configura sus cursos y stands.</p></section>
        : <div className="events-layout">
          <aside className="event-list" aria-label="Eventos">
            {visibleEvents.map(event => <button className={selected?.id === event.id ? "active" : ""}
              key={event.id} onClick={() => { setSelected(event); setSettlement(undefined); }}>
              <strong>{event.name}</strong><span>{event.eventDate} · {
                statusLabel[event.status]}</span>
            </button>)}
            {eventPages > 1 && <Pagination currentPage={eventPage} totalPages={eventPages}
              hasPrevious={eventPage > 1} hasNext={eventPage < eventPages}
              onPrevious={() => changeEventPage(eventPage - 1)}
              onNext={() => changeEventPage(eventPage + 1)} ariaLabel="Paginación de eventos" />}
          </aside>
          {selected && <EventDetail event={selected} settlement={settlement}
            onExpense={anchor => { setDialogAnchor(anchor); setDialog("expense"); }}
            onRevenue={anchor => { setDialogAnchor(anchor); setDialog("revenue"); }}
            onDeleteRevenue={async () => {
              try {
                refreshSelected(await repository.deleteEventRevenue(selected.id));
                setFeedback("Recaudación eliminada.");
              } catch (error) {
                setFeedback(apiErrorMessage(error, "No fue posible eliminar la recaudación."));
              }
            }}
            onEdit={anchor => { setDialogAnchor(anchor); setDialog("edit"); }}
            onEditExpense={(expense, anchor) => { setExpenseToEdit(expense); setExpenseAnchor(anchor);
              setDialog("expense"); }}
            onDeleteExpense={async expense => {
              refreshSelected(await repository.deleteEventExpense(selected.id, expense.key));
              setFeedback("Gasto eliminado definitivamente.");
            }}
            onDeleted={() => {
              setEvents(current => current.filter(item => item.id !== selected.id));
              setSelected(undefined);
            }}
            onCalculate={() => void calculate()} onConfirm={() => void confirm()}
            onDismissSettlement={() => setSettlement(undefined)}
            onCancelSettlement={() => void cancelSettlement()} />}
        </div>}

      {dialog === "event" && <EventForm year={year} managedCourse={managedCourse}
        anchor={dialogAnchor} onClose={() => { setDialog(null); setDialogAnchor(undefined); }}
        onSaved={event => { setEvents(current => [event, ...current]); setEventPage(1); setSelected(event);
          setDialog(null); }} />}
      {dialog === "edit" && selected && <EventForm year={year} event={selected}
        managedCourse={managedCourse} anchor={dialogAnchor}
        onClose={() => { setDialog(null); setDialogAnchor(undefined); }}
        onSaved={refreshSelected} />}
      {dialog === "expense" && selected && <ExpenseForm event={selected} expense={expenseToEdit}
        anchor={expenseToEdit ? expenseAnchor : dialogAnchor}
        onClose={() => { setDialog(null); setExpenseToEdit(undefined); setExpenseAnchor(undefined);
          setDialogAnchor(undefined); }}
        onSaved={event => { setExpenseToEdit(undefined); refreshSelected(event); }} />}
      {dialog === "revenue" && selected && <RevenueForm event={selected}
        anchor={dialogAnchor} onClose={() => { setDialog(null); setDialogAnchor(undefined); }}
        onSaved={refreshSelected} />}
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
  onCalculate, onConfirm, onDismissSettlement, onCancelSettlement, onEditExpense, onDeleteExpense,
  onDeleteRevenue }: {
  event: SchoolEvent; settlement?: EventSettlement;
  onExpense: (anchor: { top: number; left: number }) => void;
  onRevenue: (anchor: { top: number; left: number }) => void;
  onDeleteRevenue: () => Promise<void>;
  onEdit: (anchor: { top: number; left: number }) => void; onDeleted: () => void;
  onCalculate: () => void; onConfirm: () => void;
  onDismissSettlement: () => void;
  onCancelSettlement: () => void;
  onEditExpense: (expense: SchoolEventExpense, anchor: { top: number; left: number }) => void;
  onDeleteExpense: (expense: SchoolEventExpense) => Promise<void>;
}) => {
  const [confirmEventDelete, setConfirmEventDelete] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [eventDeleteAnchor, setEventDeleteAnchor] = useState<{ top: number; left: number }>();
  const [confirmRevenueDelete, setConfirmRevenueDelete] = useState(false);
  const [deletingRevenue, setDeletingRevenue] = useState(false);
  const [revenueDeleteAnchor, setRevenueDeleteAnchor] = useState<{ top: number; left: number }>();
  const [cancelArmed, setCancelArmed] = useState(false);
  const closed = event.status === "CERRADO" || event.status === "CANCELADO";
  return <section className="event-detail">
    <article className="event-summary">
      <header><div><span>{statusLabel[event.status]}</span><h2>{event.name} {event.schoolYear}</h2>
        <p><FiCalendar /> {event.eventDate} · <FiUsers /> {event.participants.length} cursos</p></div>
        <div className="event-actions">
          {!closed && <button className="event-action--edit" onClick={click =>
            onEdit(anchorForCard(click.currentTarget.getBoundingClientRect(), 320, 430))}>
            <FiEdit2 /> Editar evento</button>}
          {closed && <button className={cancelArmed ? "danger" : ""} onClick={() => {
            if (!cancelArmed) { setCancelArmed(true); return; }
            onCancelSettlement();
          }}>{cancelArmed ? "Confirmar cancelación" : "Cancelar liquidación"}</button>}
          {!closed && <>
          <button className="event-action--delete danger" onClick={click => {
            setEventDeleteAnchor(anchorForCard(
              click.currentTarget.getBoundingClientRect(),
              Math.min(280, window.innerWidth - 24), 190));
            setConfirmEventDelete(true);
          }}><FiTrash2 /> Eliminar evento</button></>}
          {cancelArmed && <button type="button" onClick={() => setCancelArmed(false)}>Volver</button>}
        </div></header>
      <div className="event-metrics">
        <Metric label="Recaudación bruta" value={event.grossRevenue ?? 0} tone="income" />
        <Metric label="Gastos comunes" value={-event.commonExpenses} negative tone="expense" />
        <Metric label="Gastos de cursos" value={-event.courseExpenses} negative tone="courses" />
        <Metric label="Ganancia neta total" value={event.netProfit} tone="profit" />
        <Metric label="Remanente" value={event.remainder ?? 0} tone="remainder" />
      </div>
      {!closed && <section className="event-finance-actions">
        <div><strong>Recaudación y distribución</strong>
          <small>Gestiona el ingreso total y luego calcula el reparto por curso.</small></div>
        <div className="event-finance-buttons">
          <button className="event-action--revenue" onClick={click =>
            onRevenue(anchorForCard(click.currentTarget.getBoundingClientRect(), 320, 430))}>
            <FiDollarSign /> {event.grossRevenue != null
              ? "Editar recaudación" : "Registrar recaudación"}</button>
          {event.grossRevenue != null && <button className="event-action--delete" onClick={click => {
            setRevenueDeleteAnchor(anchorForCard(click.currentTarget.getBoundingClientRect(),
              Math.min(280, window.innerWidth - 24), 190));
            setConfirmRevenueDelete(true);
          }}><FiTrash2 /> Eliminar recaudación</button>}
          <button className="event-action--preview" disabled={event.grossRevenue == null}
            onClick={onCalculate}><FiDollarSign /> Calcular distribución</button>
        </div>
        {settlement && <div className="settlement-review">
          <div className="settlement-modal-content">
            <p>Se descontaron los gastos y el resultado se dividió entre los cursos.</p>
            <div><span>Total para distribuir</span>
              <strong>{money.format(settlement.distributable)}</strong></div>
            {settlement.remainder > 0 && <div className="settlement-warning"><span>Remanente</span>
              <strong>{money.format(settlement.remainder)}</strong></div>}
            <footer><button type="button" onClick={onDismissSettlement}><FiX /> Volver</button>
              <button type="button" disabled={settlement.courses.some(item => item.netProfit < 0)}
                onClick={onConfirm}><FiCheckCircle /> Confirmar distribución</button></footer>
          </div>
        </div>}
      </section>}
      <p><strong>Stand:</strong> {event.participants[0]?.standName}</p>
    </article>
    <div className="event-section-title"><h2>Distribución por curso</h2></div>
    <div className="course-grid">{event.participants.map(participant => {
      const preview = settlement?.courses.find(item => item.course === participant.course);
      const net = preview?.netProfit ?? participant.netProfit;
      return <article className={net != null && net < 0 ? "course-card warning" : "course-card"}
        key={participant.course}><header><div><h3>{participant.course}</h3></div>
          <span>{participant.transferStatus === "TRANSFERRED" ? "Transferida" :
            participant.transferStatus === "REQUIRES_RESOLUTION" ? "Requiere resolución" :
            "Pendiente"}</span></header>
        <dl><div><dt>Monto a recibir</dt>
          <dd>{money.format(preview?.grossShare ?? participant.grossShare ?? 0)}</dd></div>
          <div><dt>Gasto registrado</dt>
          <dd className="negative">-{money.format(preview?.expenses ??
            participant.ownExpenses ?? 0)}</dd></div><div><dt>Neto por curso</dt>
          <dd>{money.format(net ?? 0)}</dd></div></dl></article>;
    })}</div>
    <section><div className="event-expenses-header"><h2>Gastos registrados</h2>
      {!closed && <button onClick={click =>
        onExpense(anchorForCard(click.currentTarget.getBoundingClientRect(), 320, 430))}>
        <FiMinusCircle /> Registrar gasto</button>}</div><div className="expense-grid">
      {event.expenses.map(expense => <EventExpenseCard key={expense.key} expense={expense}
        editable={!closed} onEdit={anchor => onEditExpense(expense, anchor)}
        onDelete={() => onDeleteExpense(expense)} />)}</div></section>
    <ModalConfirm isOpen={confirmEventDelete} compact confirmVariant="danger"
      anchor={eventDeleteAnchor} title="Eliminar evento"
      message={`Se eliminará definitivamente el evento “${event.name}”.`}
      confirmLabel="Eliminar evento" cancelLabel="Volver" isLoading={deletingEvent}
      confirmIcon={<FiTrash2 />} cancelIcon={<FiX />}
      onCancel={() => setConfirmEventDelete(false)} onConfirm={() => void (async () => {
        setDeletingEvent(true);
        try {
          await repository.deleteEvent(event.id);
          setConfirmEventDelete(false);
          onDeleted();
        } finally {
          setDeletingEvent(false);
        }
      })()} />
    <ModalConfirm isOpen={confirmRevenueDelete} compact confirmVariant="danger"
      anchor={revenueDeleteAnchor} title="Eliminar recaudación"
      message="La recaudación registrada será eliminada del evento."
      confirmLabel="Eliminar" cancelLabel="Volver" isLoading={deletingRevenue}
      confirmIcon={<FiTrash2 />} cancelIcon={<FiX />}
      onCancel={() => setConfirmRevenueDelete(false)} onConfirm={() => void (async () => {
        setDeletingRevenue(true);
        try {
          await onDeleteRevenue();
          setConfirmRevenueDelete(false);
        } finally {
          setDeletingRevenue(false);
        }
      })()} />
  </section>;
};

const EventExpenseCard = ({ expense, editable, onEdit, onDelete }: {
  expense: SchoolEventExpense; editable: boolean;
  onEdit: (anchor: { top: number; left: number }) => void;
  onDelete: () => Promise<void>;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAnchor, setDeleteAnchor] = useState<{ top: number; left: number }>();
  return <><article className="event-expense">
    <header><strong>{expense.description}</strong><span>{expense.status === "ACTIVE"
      ? "Activo" : "Anulado"}</span></header><b>-{money.format(expense.amount)}</b>
    <p>{expense.type === "COMMON" ? "Gasto común" : `Curso: ${expense.course}`}</p>
    <span className={`expense-settlement-badge ${expense.deductFromSettlement
      ? "is-deducted" : "is-donated"}`}>{expense.deductFromSettlement
        ? "Se descuenta en la liquidación" : "Donado · no se descuenta"}</span>
    <small>{expense.date} · {expense.category || "Sin categoría"} · {expense.registeredBy}</small>
    {editable && expense.status === "ACTIVE" && <footer className="event-actions">
      <button type="button" onClick={event => {
        const card = event.currentTarget.closest(".event-expense")?.getBoundingClientRect();
        if (card) onEdit(anchorForCard(card, Math.min(320, window.innerWidth - 24), 370));
      }}><FiEdit2 /> Editar</button>
      <button type="button" className="danger" onClick={event => {
        const card = event.currentTarget.closest(".event-expense")?.getBoundingClientRect();
        if (card) setDeleteAnchor(anchorForCard(card, Math.min(280, window.innerWidth - 24), 190));
        setConfirmDelete(true);
      }}>
        <FiTrash2 /> Eliminar</button>
    </footer>}
  </article>
  <ModalConfirm isOpen={confirmDelete} compact confirmVariant="danger"
    anchor={deleteAnchor}
    title="Eliminar gasto" message={`Se eliminará el gasto “${expense.description}”.`}
    confirmLabel="Eliminar" cancelLabel="Volver" isLoading={deleting}
    confirmIcon={<FiTrash2 />} cancelIcon={<FiX />} onCancel={() => setConfirmDelete(false)}
    onConfirm={() => void (async () => {
      setDeleting(true);
      try {
        await onDelete();
        setConfirmDelete(false);
      } finally {
        setDeleting(false);
      }
    })()} />
  </>;
};

const Metric = ({ label, value, negative = false, tone }: { label: string; value: number;
  negative?: boolean; tone: "income" | "expense" | "courses" | "profit" | "remainder";
}) => <div className={`event-metric event-metric--${tone}`}>
  <div><span>{label}</span><i>{tone === "income" || tone === "remainder"
    ? <FiDollarSign aria-hidden="true" /> : tone === "courses"
      ? <FiUsers aria-hidden="true" /> : tone === "profit"
        ? <FiTrendingUp aria-hidden="true" /> : <FiMinusCircle aria-hidden="true" />}</i></div>
  <strong className={negative ? "negative" : ""}>{money.format(value)}</strong>
</div>;

const defaultParticipantCourses = (managedCourse: string) => {
  const match = managedCourse.trim().toUpperCase().match(/^(.*?)([A-Z])$/);
  if (!match) return [managedCourse, "", ""];
  const [, level, section] = match;
  const sectionCode = section.charCodeAt(0);
  return [0, 1, 2].map(offset => `${level}${String.fromCharCode(sectionCode + offset)}`);
};

const EventForm = ({ year, event, managedCourse, anchor, onClose, onSaved }: {
  year: number; event?: SchoolEvent; managedCourse: string;
  anchor?: { top: number; left: number };
  onClose: () => void; onSaved: (event: SchoolEvent) => void;
}) => {
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: event?.name ?? "Fiesta de la Familia",
    schoolYear: event?.schoolYear ?? year, eventDate: event?.eventDate ?? today,
    description: event?.description ?? "", standName: event?.participants[0]?.standName ?? "",
    courses: event?.participants.map(item => ({
      course: item.course, standType: item.standType ?? "",
    })) ?? defaultParticipantCourses(managedCourse)
      .map(course => ({ course, standType: "" })) });
  useEffect(() => {
    if (!event && managedCourse) {
      setForm(current => {
        if (current.courses.some(item => item.course)) return current;
        const courses = defaultParticipantCourses(managedCourse)
          .map(course => ({ course, standType: "" }));
        return { ...current, courses };
      });
    }
  }, [event, managedCourse]);
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
  return <Modal title={event ? "Editar evento" : "Crear evento"} onClose={onClose} compact
    anchor={anchor}>
    <form className="event-create-form" onSubmit={submit}>
    <div className="form-row"><label>Nombre<input required value={form.name}
      onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Nombre del stand<input required value={form.standName}
        onChange={e => setForm({ ...form, standName: e.target.value })} /></label></div>
    <div className="form-row"><label>Año<input required type="number" value={form.schoolYear}
      onChange={e => setForm({ ...form, schoolYear: Number(e.target.value) })} /></label>
      <label>Fecha<input required type="date" value={form.eventDate}
        onChange={e => setForm({ ...form, eventDate: e.target.value })} /></label></div>
    <label>Descripción<textarea value={form.description}
      onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    <fieldset><legend>Cursos participantes</legend>{form.courses.map((course, index) =>
      <div key={index}>{!event && index === 0 ? <select aria-label="Curso administrado"
        required value={course.course} onChange={e => {
          const courses = [...form.courses];
          courses[index] = { ...course, course: e.target.value.toUpperCase() };
          setForm({ ...form, courses }); }}>
          {!managedCourse && <option value="">Cargando curso administrado…</option>}
          {managedCourse && <option value={managedCourse}>{managedCourse}</option>}
        </select> : <input aria-label={`Curso ${index + 1}`}
          placeholder="Curso" required value={course.course} onChange={e => {
            const courses = [...form.courses];
            courses[index] = { ...course, course: e.target.value.toUpperCase() };
            setForm({ ...form, courses }); }} />}</div>)}</fieldset>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}><FiX /> Cancelar</button>
      <button type="submit"><FiPlus /> {event ? "Guardar cambios" : "Crear evento"}</button>
    </footer></form></Modal>;
};

const ExpenseForm = ({ event, expense, anchor, onClose, onSaved }: { event: SchoolEvent;
  expense?: SchoolEventExpense; anchor?: { top: number; left: number };
  onClose: () => void; onSaved: (event: SchoolEvent) => void }) => {
  const [error, setError] = useState("");
  const [form, setForm] = useState({ description: expense?.description ?? "",
    amount: expense?.amount ?? 0, date: expense?.date ?? today,
    type: expense?.type ?? "COMMON" as "COMMON" | "COURSE", course: expense?.course ?? "",
    category: expense?.category ?? "", responsible: expense?.responsible ?? "",
    paymentMethod: expense?.paymentMethod ?? "CASH",
    deductFromSettlement: expense?.deductFromSettlement ?? true });
  return <Modal title={expense ? "Editar gasto" : "Registrar gasto"} onClose={onClose} compact
    centered={!anchor} anchor={anchor}>
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
      value={form.amount || ""}
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
    <label className="expense-deduction-option">
      <input type="checkbox" checked={form.deductFromSettlement}
        onChange={e => setForm({ ...form, deductFromSettlement: e.target.checked })} />
      <span><strong>Descontar este gasto en la liquidación final</strong>
        <small>Desmárcalo si el gasto es donado. Quedará registrado, pero no reducirá
          el monto que se reparte entre los cursos.</small></span>
    </label>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}><FiX /> Cancelar</button>
      <button type="submit"><FiMinusCircle /> {expense ? "Guardar cambios" : "Registrar gasto"}</button>
    </footer></form></Modal>;
};

const RevenueForm = ({ event, anchor, onClose, onSaved }: { event: SchoolEvent;
  anchor?: { top: number; left: number }; onClose: () => void;
  onSaved: (event: SchoolEvent) => void }) => {
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(event.grossRevenue?.toString() ?? "");
  const [date, setDate] = useState(event.revenueDate ?? today);
  const [description, setDescription] = useState(event.revenueDescription ??
    `Recaudación total ${event.name} ${event.schoolYear}`);
  const [paymentMethod, setPaymentMethod] = useState(event.revenuePaymentMethod ?? "CASH");
  const [receiptNumber, setReceiptNumber] = useState(event.revenueReceipt ?? "");
  const [observations, setObservations] = useState(event.revenueObservations ?? "");
  const payload = useMemo(() => ({ amount: Number(amount), date, description, paymentMethod,
    receiptNumber: receiptNumber || undefined, observations: observations || undefined }),
    [amount, date, description, paymentMethod, receiptNumber, observations]);
  const editing = event.grossRevenue != null;
  return <Modal title={editing ? "Editar recaudación" : "Registrar recaudación"}
    onClose={onClose} compact anchor={anchor}><form onSubmit={async e => {
    e.preventDefault();
    try { setError(""); onSaved(await repository.registerEventRevenue(event.id, payload)); }
    catch (requestError) {
      setError(apiErrorMessage(requestError, "No fue posible guardar la recaudación."));
    }
  }}>
    <label>Monto total recaudado<input autoFocus required min="1" type="number"
      inputMode="numeric" placeholder="0" value={amount}
      onChange={e => setAmount(e.target.value)} /></label>
    <div className="form-row">
      <label>Fecha<input required type="date" value={date}
        onChange={e => setDate(e.target.value)} /></label>
      <label>Medio de pago<select value={paymentMethod}
        onChange={e => setPaymentMethod(e.target.value)}>
        <option value="CASH">Efectivo</option>
        <option value="TRANSFER">Transferencia</option>
        <option value="MIXED">Mixto</option>
      </select></label>
    </div>
    <label>Descripción<input value={description}
      onChange={e => setDescription(e.target.value)} /></label>
    <label>Número de comprobante (opcional)<input value={receiptNumber}
      onChange={e => setReceiptNumber(e.target.value)} /></label>
    <label>Observaciones (opcional)<textarea value={observations}
      onChange={e => setObservations(e.target.value)} /></label>
    <p>La recaudación se dividirá por la cantidad real de cursos participantes.</p>
    {error && <p className="events-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}><FiX /> Cancelar</button>
      <button type="submit"><FiDollarSign /> {editing
        ? "Guardar cambios" : "Guardar recaudación"}</button></footer></form></Modal>;
};

const Modal = ({ title, onClose, children, compact = false, centered = false, anchor }: { title: string;
  onClose: () => void; children: React.ReactNode; compact?: boolean; centered?: boolean;
  anchor?: { top: number; left: number } }) =>
  <div className={`event-modal ${compact ? "event-modal--compact" : ""} ${
    centered ? "event-modal--centered" : ""} ${anchor ? "event-modal--anchored" : ""}`}
    role="presentation"
    onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="event-dialog-title"
      style={anchor ? { position: "fixed", top: anchor.top, left: anchor.left } : undefined}>
      <header><h2 id="event-dialog-title">{title}</h2>
        <button aria-label="Cerrar" onClick={onClose}>×</button></header>{children}</section></div>;
