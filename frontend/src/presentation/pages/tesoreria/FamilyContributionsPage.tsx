import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FiAlertCircle, FiAward, FiCheck, FiCheckCircle, FiClock, FiHeart,
  FiFilter, FiSearch, FiUsers, FiX } from "react-icons/fi";
import type {
  ContributionStatus, ContributionSummary, ContributionType,
  FamilyContribution,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./FamilyContributionsPage.css";

const repository = new TreasuryRepositoryImpl();
const currentYear = new Date().getFullYear();
const schoolYears = Array.from({ length: 10 }, (_, index) => 2026 + index);
const localToday = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const today = localToday();
const emptySummary: ContributionSummary = {
  totalFamilies: 0, cepaPaid: 0, cepaPending: 0, solidarityPaid: 0,
  solidarityPending: 0, fullyPaid: 0, withPending: 0,
};

const isPaid = (status?: ContributionStatus) => status === "PAID";
const PAGE_SIZE = 3;
type PendingAction = { kind: "pay" | "cancel"; type: ContributionType } | null;

export const FamilyContributionsPage = () => {
  const { user } = useAuth();
  const canManage = user?.rol === "ADMIN";
  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState<FamilyContribution[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [cepaStatus, setCepaStatus] = useState("");
  const [solidarityStatus, setSolidarityStatus] = useState("");
  const [selected, setSelected] = useState<FamilyContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [paymentDate, setPaymentDate] = useState(today);
  const [cancellationReason, setCancellationReason] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const activeFilters = [search.trim(), course, cepaStatus, solidarityStatus]
    .filter(Boolean).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {
        ...(search.trim() && { search: search.trim() }),
        ...(course && { course }),
        ...(cepaStatus && { cepaStatus: cepaStatus as "PAID" | "PENDING" }),
        ...(solidarityStatus && {
          solidarityStatus: solidarityStatus as "PAID" | "PENDING",
        }),
      };
      const [families, totals] = await Promise.all([
        repository.listContributions(year, filters),
        repository.contributionSummary(year),
      ]);
      setItems(families);
      setSummary(totals);
    } catch {
      setError("No fue posible cargar los aportes. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [year, search, course, cepaStatus, solidarityStatus]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [year, search, course, cepaStatus, solidarityStatus]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  const courses = useMemo(
    () => [...new Set(items.map((item) => item.course).filter(Boolean))].sort(),
    [items],
  );

  const pay = async (type: ContributionType) => {
    if (!selected) return;
    const label = type === "CEPA" ? "Cuota CEPA" : "Cuota Solidaria";
    setSaving(true);
    setError("");
    try {
      await repository.payContribution(selected.familyId, year, type, paymentDate);
      setMessage(`La ${label} de la familia ${selected.familyCode} fue marcada como pagada.`);
      setPendingAction(null);
      setSelected(null);
      await load();
    } catch {
      setError("No fue posible actualizar el estado. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (type: ContributionType) => {
    if (!selected) return;
    const payment = type === "CEPA" ? selected.cepa : selected.solidarity;
    if (!payment?.id) return;
    if (!cancellationReason.trim()) {
      setError("Debes indicar el motivo de la anulación.");
      return;
    }
    setSaving(true);
    try {
      await repository.cancelContribution(payment.id, cancellationReason.trim());
      setMessage("El registro de pago fue anulado correctamente.");
      setPendingAction(null);
      setCancellationReason("");
      setSelected(null);
      await load();
    } catch {
      setError("No fue posible actualizar el estado. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="contributions-page">
      <header className="contributions-page__header">
        <div>
          <h1>Cuota CEPA y Cuota Solidaria</h1>
          <p>
            Seguimiento anual por familia. Las familias existentes aparecen automáticamente
            cada año; solo debes seleccionar el año y actualizar sus estados.
          </p>
        </div>
      </header>

      <section className="contributions-summary" aria-label="Resumen de aportes">
        {loading ? Array.from({ length: 6 }, (_, index) =>
          <article className="contribution-summary-skeleton" key={index} aria-hidden="true">
            <div className="skeleton-block" /><div className="skeleton-block" />
          </article>) : <>
          <SummaryCard label="Total familias" value={summary.totalFamilies} tone="families"
            icon={<FiUsers />} />
          <SummaryCard label="CEPA pagada" value={summary.cepaPaid} tone="cepa-paid"
            icon={<FiCheckCircle />} />
          <SummaryCard label="CEPA pendiente" value={summary.cepaPending} tone="cepa-pending"
            icon={<FiClock />} />
          <SummaryCard label="Solidaria pagada" value={summary.solidarityPaid}
            tone="solidarity-paid" icon={<FiHeart />} />
          <SummaryCard label="Solidaria pendiente" value={summary.solidarityPending}
            tone="solidarity-pending" icon={<FiAlertCircle />} />
          <SummaryCard label="Completamente al día" value={summary.fullyPaid} tone="complete"
            icon={<FiAward />} />
        </>}
      </section>

      <div className="contributions-filter-toolbar">
        <button type="button" className="contributions-filter-trigger"
          onClick={() => setFiltersOpen(true)}>
          <FiFilter aria-hidden="true" /> Filtros
          {activeFilters > 0 && <span>{activeFilters}</span>}
        </button>
      </div>

      {filtersOpen && <div className="contributions-filter-backdrop"
        onClick={() => setFiltersOpen(false)}>
      <aside className="contributions-filters" aria-label="Filtros" role="dialog"
        aria-modal="true" onClick={event => event.stopPropagation()}>
        <header><div><FiFilter aria-hidden="true" /><h2>Filtros</h2></div>
          <button type="button" aria-label="Cerrar filtros"
            onClick={() => setFiltersOpen(false)}><FiX /></button></header>
        <label className="contributions-search">
          <FiSearch aria-hidden="true" />
          <span className="sr-only">Buscar familia o alumno</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar familia" />
        </label>
        <Filter label="Año" value={String(year)} onChange={(value) => setYear(Number(value))}
          options={schoolYears.map(String)} />
        <Filter label="Curso" value={course} onChange={setCourse}
          options={courses} allLabel="Todos los cursos" />
        <Filter label="Estado CEPA" value={cepaStatus} onChange={setCepaStatus}
          options={["PAID", "PENDING"]} labels={["Pagada", "Pendiente"]} />
        <Filter label="Estado Solidaria" value={solidarityStatus}
          onChange={setSolidarityStatus} options={["PAID", "PENDING"]}
          labels={["Pagada", "Pendiente"]} />
        <footer className="contributions-filter-actions">
          <button type="button" className="contributions-filter-clear" onClick={() => {
            setSearch("");
            setCourse("");
            setCepaStatus("");
            setSolidarityStatus("");
          }}>Limpiar filtros</button>
          <button type="button" className="contributions-filter-apply"
            onClick={() => setFiltersOpen(false)}>Ver resultados</button>
        </footer>
      </aside></div>}

      {loading ? (
        <ContributionsSkeleton />
      ) : items.length === 0 ? (
        <p className="contributions-page__empty">No hay familias para los filtros seleccionados.</p>
      ) : (
        <section className="contributions-grid" aria-label="Familias">
          {visibleItems.map((item) => (
            <article className={`contribution-card ${
              isPaid(item.cepa?.status) && isPaid(item.solidarity?.status) ? "is-complete" : ""
            }`} key={item.familyId}>
              <div className="contribution-card__heading">
                <div>
                  <h2>Familia {item.familyCode}</h2>
                  <p>{item.primaryGuardian ? `Apoderado: ${item.primaryGuardian}` : item.studentName}</p>
                </div>
                <span>{item.course}</span>
              </div>
              <div className="contribution-card__statuses">
                <ContributionBadge label="CEPA" status={item.cepa?.status} />
                <ContributionBadge label="Solidaria" status={item.solidarity?.status} />
              </div>
              <button type="button" onClick={() => setSelected(item)}>
                {canManage ? "Gestionar aportes" : "Ver detalle"}
              </button>
            </article>
          ))}
        </section>
      )}

      {!loading && items.length > PAGE_SIZE && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          hasPrevious={page > 1}
          hasNext={page < totalPages}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          ariaLabel="Paginación de aportes"
        />
      )}

      {selected && (
        <div className="contribution-modal-backdrop" role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="contribution-modal" role="dialog" aria-modal="true"
            aria-labelledby="contribution-modal-title">
            <button className="contribution-modal__close" type="button"
              aria-label="Cerrar" onClick={() => setSelected(null)}><FiX /></button>
            <span>{selected.course}</span>
            <h2 id="contribution-modal-title">Familia {selected.familyCode}</h2>
            <p>{selected.primaryGuardian && `Apoderado: ${selected.primaryGuardian} · `}
              Alumno: {selected.studentName}</p>
            <div className="contribution-modal__actions">
              <ContributionAction label="Cuota CEPA" payment={selected.cepa}
                canManage={canManage} disabled={saving}
                onPay={() => {
                  setPaymentDate(localToday());
                  setPendingAction({ kind: "pay", type: "CEPA" });
                }}
                onCancel={() => setPendingAction({ kind: "cancel", type: "CEPA" })} />
              <ContributionAction label="Cuota Solidaria" payment={selected.solidarity}
                canManage={canManage} disabled={saving}
                onPay={() => {
                  setPaymentDate(localToday());
                  setPendingAction({ kind: "pay", type: "SOLIDARIA" });
                }}
                onCancel={() => setPendingAction({ kind: "cancel", type: "SOLIDARIA" })} />
            </div>
          </section>
        </div>
      )}

      <ModalConfirm
        isOpen={Boolean(pendingAction && selected)}
        title={pendingAction?.kind === "cancel" ? "Anular registro de pago" : "Confirmar pago"}
        message={pendingAction && selected
          ? pendingAction.kind === "cancel"
            ? `Se anulará la ${pendingAction.type === "CEPA" ? "Cuota CEPA" : "Cuota Solidaria"} de la familia ${selected.familyCode}. Esta acción quedará auditada.`
            : `Se registrará la ${pendingAction.type === "CEPA" ? "Cuota CEPA" : "Cuota Solidaria"} de la familia ${selected.familyCode}.`
          : ""}
        confirmLabel={pendingAction?.kind === "cancel" ? "Anular pago" : "Registrar pago"}
        cancelLabel="Volver"
        isLoading={saving}
        confirmDisabled={pendingAction?.kind === "pay" && !paymentDate}
        compact
        onCancel={() => {
          setPendingAction(null);
          setCancellationReason("");
        }}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.kind === "pay") void pay(pendingAction.type);
          else void cancel(pendingAction.type);
        }}
      >
        {pendingAction?.kind === "pay" && (
          <label>
            Fecha de pago
            <input type="date" value={paymentDate} max={today}
              onChange={(event) => setPaymentDate(event.target.value)} autoFocus />
          </label>
        )}
        {pendingAction?.kind === "cancel" && (
          <label>
            Motivo de la anulación
            <textarea
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Ej.: pago registrado en la familia equivocada"
              maxLength={500}
              autoFocus
            />
          </label>
        )}
      </ModalConfirm>

      <ModalAlert
        isOpen={Boolean(message)}
        type="success"
        title="Operación realizada"
        message={message}
        buttonLabel="Continuar"
        onClose={() => setMessage("")}
      />
      <ModalAlert
        isOpen={Boolean(error)}
        type="error"
        title="No fue posible completar la acción"
        message={error}
        buttonLabel="Revisar"
        onClose={() => setError("")}
      />
    </main>
  );
};

const SummaryCard = ({ label, value, icon, tone }: {
  label: string; value: number; icon: ReactNode; tone: string;
}) => <article className={`contribution-summary-card contribution-summary-card--${tone}`}>
  <div><span>{label}</span><i aria-hidden="true">{icon}</i></div><strong>{value}</strong>
</article>;

const ContributionsSkeleton = () => (
  <section className="contributions-grid" aria-label="Cargando familias" role="status">
    {Array.from({ length: PAGE_SIZE }, (_, index) => (
      <article className="contribution-card contribution-card--skeleton" key={index}
        aria-hidden="true">
        <div className="contribution-card__heading">
          <div><div className="skeleton-block" /><div className="skeleton-block" /></div>
          <div className="skeleton-block" />
        </div>
        <div className="skeleton-block contribution-badge-skeleton" />
        <div className="skeleton-block contribution-badge-skeleton" />
        <div className="skeleton-block contribution-button-skeleton" />
      </article>
    ))}
  </section>
);

const Filter = ({ label, value, onChange, options, labels, allLabel = "Todos" }: {
  label: string; value: string; onChange: (value: string) => void; options: string[];
  labels?: string[]; allLabel?: string;
}) => <label><span>{label}</span><select value={value}
  onChange={(event) => onChange(event.target.value)}>
  {label !== "Año" && <option value="">{allLabel}</option>}
  {options.map((option, index) => <option key={option} value={option}>
    {labels?.[index] ?? option}
  </option>)}
</select></label>;

const ContributionBadge = ({ label, status }: { label: string; status?: ContributionStatus }) => {
  const paid = isPaid(status);
  return <div className={`contribution-badge ${paid ? "is-paid" : "is-pending"}`}>
    {paid ? <FiCheck aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}
    <span><strong>{label}</strong>{paid ? "Pagada" : "Pendiente"}</span>
  </div>;
};

const ContributionAction = ({ label, payment, canManage, disabled, onPay, onCancel }: {
  label: string; payment?: FamilyContribution["cepa"]; canManage: boolean; disabled: boolean;
  onPay: () => void; onCancel: () => void;
}) => {
  const paid = isPaid(payment?.status);
  return <article className="contribution-modal__item">
    <ContributionBadge label={label} status={payment?.status} />
    <small className={!payment?.paymentDate ? "is-placeholder" : undefined}
      aria-hidden={!payment?.paymentDate || undefined}>
      {payment?.paymentDate ? `Fecha de pago: ${payment.paymentDate}` : "Fecha de pago pendiente"}
    </small>
    {canManage && (paid
      ? <button type="button" className="is-danger" disabled={disabled}
          onClick={onCancel}>Anular registro de pago</button>
      : <button type="button" disabled={disabled} onClick={onPay}>Marcar como pagada</button>)}
  </article>;
};
