import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FiMessageSquare, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import type {
  AdminImprovementSuggestion,
  ImprovementAdminFilters,
  ImprovementAdminSummary,
  ImprovementCategory,
  ImprovementPriority,
  ImprovementStatus,
  ImprovementSuggestionHistory,
  ImprovementSuggestionNote,
  UserImpact,
} from "@/core/A-domain/entities/improvement/ImprovementSuggestion";
import { ImprovementSuggestionUseCases } from
  "@/core/B-application/use-cases/improvement/ImprovementSuggestionUseCases";
import { ImprovementSuggestionRepositoryImpl } from
  "@/core/C-infra/repositories/improvement/ImprovementSuggestionRepositoryImpl";
import { apiClient } from "@/core/D-config/api";
import { Button } from "@/shared/ui/button/Button";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "./ImprovementAdminPage.css";

const useCases = new ImprovementSuggestionUseCases(new ImprovementSuggestionRepositoryImpl());
const pageSize = 10;

const statuses: Array<[ImprovementStatus | "", string]> = [
  ["", "Todos"], ["RECEIVED", "Recibida"], ["UNDER_REVIEW", "En revisión"],
  ["PLANNED", "Planificada"], ["IMPLEMENTED", "Implementada"], ["REJECTED", "Descartada"],
];
const categories: Array<[ImprovementCategory | "", string]> = [
  ["", "Todas"], ["PAYMENTS", "Pagos"], ["STUDENTS", "Alumnos"], ["REPORTS", "Reportes"],
  ["UX", "Interfaz"], ["PERFORMANCE", "Rendimiento"], ["COURSES_ADMIN", "Cursos"], ["OTHER", "Otra"],
];
const impacts: Array<[UserImpact | "", string]> = [
  ["", "Todos"], ["USEFUL", "Sería útil"], ["DIFFICULT", "Dificulta"], ["BLOCKING", "Bloquea"],
];
const priorities: Array<[ImprovementPriority | "", string]> = [
  ["", "Todas"], ["LOW", "Baja"], ["MEDIUM", "Media"], ["HIGH", "Alta"], ["CRITICAL", "Crítica"],
];
const statusLabel = Object.fromEntries(statuses.filter(([value]) => value)) as Record<ImprovementStatus, string>;
const categoryLabel = Object.fromEntries(categories.filter(([value]) => value)) as Record<ImprovementCategory, string>;
const impactLabel = Object.fromEntries(impacts.filter(([value]) => value)) as Record<UserImpact, string>;
const priorityLabel = Object.fromEntries(priorities.filter(([value]) => value)) as Record<ImprovementPriority, string>;

export const ImprovementAdminPage = () => {
  const [filters, setFilters] = useState<ImprovementAdminFilters>({
    page: 0, size: pageSize, sortBy: "createdAt", direction: "desc",
  });
  const [summary, setSummary] = useState<ImprovementAdminSummary>();
  const [rows, setRows] = useState<AdminImprovementSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<AdminImprovementSuggestion | null>(null);
  const [notes, setNotes] = useState<ImprovementSuggestionNote[]>([]);
  const [history, setHistory] = useState<ImprovementSuggestionHistory[]>([]);
  const [note, setNote] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminImprovementSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [page, stats] = await Promise.all([
        useCases.adminList(filters),
        useCases.adminSummary(),
      ]);
      setRows(page.content);
      setTotalPages(Math.max(1, page.totalPages));
      setSummary(stats);
      setSelected(current => current
        ? page.content.find(item => item.id === current.id) ?? current
        : page.content[0] ?? null);
    } catch {
      setError("No fue posible cargar las sugerencias.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const [detail, detailNotes, detailHistory] = await Promise.all([
        useCases.adminDetail(id),
        useCases.notes(id),
        useCases.history(id),
      ]);
      setSelected(detail);
      setNotes(detailNotes);
      setHistory(detailHistory);
    } catch {
      setToast("No fue posible cargar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selected) void loadDetail(selected.id); }, [selected?.id, loadDetail]);

  const applyFilter = <K extends keyof ImprovementAdminFilters>(key: K, value: ImprovementAdminFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value, page: 0 }));
  };

  const updateStatus = async (status: ImprovementStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await useCases.updateStatus(selected.id, status);
      replaceRow(updated);
      setToast("Estado actualizado.");
      await loadDetail(updated.id);
    } catch {
      setToast("No fue posible actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const updatePriority = async (priority: ImprovementPriority) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await useCases.updatePriority(selected.id, priority);
      replaceRow(updated);
      setToast("Prioridad actualizada.");
      await loadDetail(updated.id);
    } catch {
      setToast("No fue posible actualizar la prioridad.");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !note.trim()) return;
    setSaving(true);
    try {
      await useCases.addNote(selected.id, note.trim());
      setNote("");
      setToast("Nota interna agregada.");
      setNotes(await useCases.notes(selected.id));
    } catch {
      setToast("No fue posible agregar la nota.");
    } finally {
      setSaving(false);
    }
  };

  const relate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !relatedId.trim()) return;
    setSaving(true);
    try {
      const updated = await useCases.relate(selected.id, Number(relatedId.replace("#", "")));
      replaceRow(updated);
      setRelatedId("");
      setToast("Sugerencia relacionada.");
      await loadDetail(updated.id);
    } catch {
      setToast("No fue posible relacionar la sugerencia.");
    } finally {
      setSaving(false);
    }
  };

  const openScreenshot = async () => {
    if (!selected?.screenshotUrl) return;
    setSaving(true);
    try {
      const response = await apiClient.get<Blob>(selected.screenshotUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setToast("No fue posible abrir la captura.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await useCases.deleteAdmin(deleteTarget.id);
      setRows(current => {
        const remaining = current.filter(item => item.id !== deleteTarget.id);
        setSelected(selectedCurrent => selectedCurrent?.id === deleteTarget.id
          ? remaining[0] ?? null
          : selectedCurrent);
        return remaining;
      });
      setNotes([]);
      setHistory([]);
      setDeleteTarget(null);
      setToast("Mejora eliminada definitivamente.");
      await load();
    } catch {
      setToast("No fue posible eliminar la mejora.");
    } finally {
      setSaving(false);
    }
  };

  const replaceRow = (updated: AdminImprovementSuggestion) => {
    setSelected(updated);
    setRows(current => current.map(item => item.id === updated.id ? updated : item));
  };

  const totals = useMemo(() => [
    ["Total", summary?.total ?? 0],
    ["Recibidas", summary?.received ?? 0],
    ["En revisión", summary?.underReview ?? 0],
    ["Planificadas", summary?.planned ?? 0],
    ["Implementadas", summary?.implemented ?? 0],
    ["Críticas", summary?.critical ?? 0],
  ], [summary]);

  if (error && !loading) return <FeedbackState message={error} onRefresh={() => void load()} />;

  return <main className="improvement-admin-page">
    <header className="improvement-admin-page__header">
      <div>
        <span>Centro de Mejoras</span>
        <h1>Gestión de Mejoras</h1>
        <p>Revisa sugerencias, ajusta prioridad interna y registra notas privadas.</p>
      </div>
      <Button label="Actualizar" variant="secondary" icon={<FiRefreshCw />}
        onClick={() => void load()} disabled={loading} />
    </header>

    <section className="improvement-admin-summary" aria-label="Resumen de sugerencias">
      {totals.map(([label, value]) => <article key={label}>
        <span>{label}</span><strong>{value}</strong>
      </article>)}
    </section>

    <section className="improvement-admin-filters" aria-label="Filtros de sugerencias">
      <label>Buscar
        <span><FiSearch aria-hidden="true" /><input value={filters.search ?? ""}
          placeholder="ID, título, descripción o usuario"
          onChange={event => applyFilter("search", event.target.value)} /></span>
      </label>
      <Select label="Estado" value={filters.status ?? ""} options={statuses}
        onChange={value => applyFilter("status", value as ImprovementStatus | "")} />
      <Select label="Categoría" value={filters.category ?? ""} options={categories}
        onChange={value => applyFilter("category", value as ImprovementCategory | "")} />
      <Select label="Impacto" value={filters.impact ?? ""} options={impacts}
        onChange={value => applyFilter("impact", value as UserImpact | "")} />
      <Select label="Prioridad" value={filters.priority ?? ""} options={priorities}
        onChange={value => applyFilter("priority", value as ImprovementPriority | "")} />
      <label>Desde<input type="date" value={filters.from ?? ""}
        onChange={event => applyFilter("from", event.target.value)} /></label>
      <label>Hasta<input type="date" value={filters.to ?? ""}
        onChange={event => applyFilter("to", event.target.value)} /></label>
      <Select label="Orden" value={`${filters.sortBy}:${filters.direction}`} options={[
        ["createdAt:desc", "Creación reciente"], ["updatedAt:desc", "Actualización reciente"],
        ["priority:desc", "Prioridad"], ["status:asc", "Estado"],
      ]} onChange={value => {
        const [sortBy, direction] = value.split(":");
        setFilters(current => ({ ...current, sortBy: sortBy as ImprovementAdminFilters["sortBy"],
          direction: direction as ImprovementAdminFilters["direction"], page: 0 }));
      }} />
    </section>

    <section className="improvement-admin-workspace">
      <div className="improvement-admin-list">
        {loading ? <p className="improvement-admin-empty">Cargando sugerencias...</p>
          : rows.length === 0 ? <p className="improvement-admin-empty">No hay sugerencias con estos filtros.</p>
          : rows.map(item => <button key={item.id} type="button"
            className={selected?.id === item.id ? "is-active" : ""}
            onClick={() => setSelected(item)}>
            <span><strong>#{item.id} {item.title}</strong>
              <small>{item.userName} · {categoryLabel[item.category]} · {date(item.createdAt)}</small></span>
            <em className={`status status--${item.status.toLowerCase()}`}>{statusLabel[item.status]}</em>
            <b className={`priority priority--${item.internalPriority.toLowerCase()}`}>
              {priorityLabel[item.internalPriority]}
            </b>
          </button>)}
        <Pagination currentPage={filters.page + 1} totalPages={totalPages}
          hasPrevious={filters.page > 0} hasNext={filters.page + 1 < totalPages}
          loading={loading} onPrevious={() => setFilters(current => ({ ...current, page: current.page - 1 }))}
          onNext={() => setFilters(current => ({ ...current, page: current.page + 1 }))}
          ariaLabel="Paginación de sugerencias" />
      </div>

      <Detail selected={selected} notes={notes} history={history} note={note}
        relatedId={relatedId} loading={detailLoading} saving={saving}
        onStatus={updateStatus} onPriority={updatePriority} onNote={setNote}
        onAddNote={addNote} onRelatedId={setRelatedId} onRelate={relate}
        onOpenScreenshot={openScreenshot} onDelete={setDeleteTarget} />
    </section>

    <ModalAlert isOpen={Boolean(toast)} type={toast.startsWith("No fue") ? "error" : "success"}
      message={toast} variant="toast" autoCloseTime={2600} onClose={() => setToast("")} />
    <ModalConfirm isOpen={Boolean(deleteTarget)} title="Eliminar mejora definitivamente"
      message={`Esta acción eliminará la mejora #${deleteTarget?.id ?? ""}, sus notas, historial, relaciones y captura adjunta. No se puede deshacer.`}
      confirmLabel="Eliminar definitivamente" cancelLabel="Volver" confirmVariant="danger"
      isLoading={saving} confirmIcon={<FiTrash2 />} onConfirm={() => void deleteSelected()}
      onCancel={() => setDeleteTarget(null)} />
  </main>;
};

const Detail = ({ selected, notes, history, note, relatedId, loading, saving, onStatus,
  onPriority, onNote, onAddNote, onRelatedId, onRelate, onOpenScreenshot, onDelete }: {
  selected: AdminImprovementSuggestion | null;
  notes: ImprovementSuggestionNote[];
  history: ImprovementSuggestionHistory[];
  note: string;
  relatedId: string;
  loading: boolean;
  saving: boolean;
  onStatus: (status: ImprovementStatus) => void;
  onPriority: (priority: ImprovementPriority) => void;
  onNote: (value: string) => void;
  onAddNote: (event: FormEvent) => void;
  onRelatedId: (value: string) => void;
  onRelate: (event: FormEvent) => void;
  onOpenScreenshot: () => void;
  onDelete: (suggestion: AdminImprovementSuggestion) => void;
}) => <aside className="improvement-admin-detail" aria-label="Detalle administrativo">
  {!selected ? <p className="improvement-admin-empty">Selecciona una sugerencia.</p> : <>
    <header><span>#{selected.id}</span><h2>{selected.title}</h2>
      <p>{selected.description}</p></header>
    {loading && <p className="improvement-admin-empty">Actualizando detalle...</p>}
    <div className="improvement-admin-detail__controls">
      <Select label="Estado" value={selected.status} options={statuses.filter(([value]) => value)}
        disabled={saving} onChange={value => onStatus(value as ImprovementStatus)} />
      <Select label="Prioridad interna" value={selected.internalPriority}
        options={priorities.filter(([value]) => value)} disabled={saving}
        onChange={value => onPriority(value as ImprovementPriority)} />
    </div>
    <dl>
      <dt>Categoría</dt><dd>{categoryLabel[selected.category]}</dd>
      <dt>Impacto</dt><dd>{impactLabel[selected.userImpact]}</dd>
      <dt>Usuario</dt><dd>{selected.userName} · {selected.userEmail}</dd>
      <dt>Rol</dt><dd>{selected.userRole}</dd>
      <dt>Organización</dt><dd>{selected.organizationName ?? "Sin organización"}</dd>
      <dt>Curso</dt><dd>{selected.courseName ?? "Sin curso"}</dd>
      <dt>Ruta</dt><dd>{selected.sourceRoute}</dd>
      <dt>Creación</dt><dd>{dateTime(selected.createdAt)}</dd>
      <dt>Actualización</dt><dd>{dateTime(selected.updatedAt)}</dd>
      <dt>Opciones</dt><dd>{selected.selectedItems.length ? selected.selectedItems.join(", ") : "Sin opciones"}</dd>
      <dt>Relacionadas</dt><dd>{selected.relatedSuggestionIds.length
        ? selected.relatedSuggestionIds.map(id => `#${id}`).join(", ") : "Sin relaciones"}</dd>
    </dl>
    {selected.screenshotUrl && <button className="improvement-admin-screenshot" type="button"
      disabled={saving} onClick={onOpenScreenshot}>
      Ver captura adjunta
    </button>}
    <div className="improvement-admin-danger-zone">
      <strong>Eliminación definitiva</strong>
      <p>Quita esta mejora y todo su registro interno del sistema.</p>
      <Button label="Eliminar definitivamente" variant="danger" icon={<FiTrash2 />}
        disabled={saving} onClick={() => onDelete(selected)} />
    </div>
    <form className="improvement-admin-note" onSubmit={onAddNote}>
      <label htmlFor="improvement-admin-note">Nota interna</label>
      <textarea id="improvement-admin-note" maxLength={1200} value={note}
        onChange={event => onNote(event.target.value)} rows={3} />
      <Button label="Agregar nota" type="submit" icon={<FiMessageSquare />}
        disabled={saving || !note.trim()} loading={saving} onClick={() => undefined} />
    </form>
    <form className="improvement-admin-relation" onSubmit={onRelate}>
      <label htmlFor="improvement-related">Relacionar sugerencia</label>
      <input id="improvement-related" value={relatedId} placeholder="#124"
        onChange={event => onRelatedId(event.target.value)} />
      <Button label="Relacionar" type="submit" variant="secondary"
        disabled={saving || !relatedId.trim()} onClick={() => undefined} />
    </form>
    <section><h3>Notas internas</h3>
      {notes.length === 0 ? <p className="improvement-admin-empty">Sin notas internas.</p>
        : notes.map(item => <article className="improvement-admin-note-item" key={item.id}>
          <p>{item.content}</p><small>{item.authorName} · {dateTime(item.createdAt)}</small>
        </article>)}</section>
    <section><h3>Historial</h3>
      {history.length === 0 ? <p className="improvement-admin-empty">Sin cambios registrados.</p>
        : history.map(item => <article className="improvement-admin-history-item" key={item.id}>
          <strong>{item.fieldName}: {item.oldValue ?? "Sin valor"} → {item.newValue}</strong>
          <small>{item.changedByName} · {dateTime(item.createdAt)}</small>
        </article>)}</section>
  </>}
</aside>;

const Select = ({ label, value, options, disabled = false, onChange }: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) => <label>{label}<select value={value} disabled={disabled}
  onChange={event => onChange(event.target.value)}>
  {options.map(([option, text]) => <option key={option || text} value={option}>{text}</option>)}
</select></label>;

const date = (value: string) => new Date(value).toLocaleDateString("es-CL");
const dateTime = (value: string) => new Date(value).toLocaleString("es-CL");
