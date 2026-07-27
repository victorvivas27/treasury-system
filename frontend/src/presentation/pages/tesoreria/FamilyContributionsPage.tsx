import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiCheck, FiSearch, FiX } from "react-icons/fi";
import type {
  ContributionStatus, ContributionSummary, ContributionType,
  FamilyContribution,
} from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "./FamilyContributionsPage.css";

const repository = new TreasuryRepositoryImpl();
const currentYear = new Date().getFullYear();
const schoolYears = Array.from({ length: 10 }, (_, index) => 2026 + index);
const today = new Date().toISOString().slice(0, 10);
const emptySummary: ContributionSummary = {
  totalFamilies: 0, cepaPaid: 0, cepaPending: 0, solidarityPaid: 0,
  solidarityPending: 0, fullyPaid: 0, withPending: 0,
};

const isPaid = (status?: ContributionStatus) => status === "PAID";
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
  const [cancellationReason, setCancellationReason] = useState("");

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
      await repository.payContribution(selected.familyId, year, type, today);
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
          <span className="contributions-page__eyebrow">Tesorería del curso</span>
          <h1>Cuota CEPA y Cuota Solidaria</h1>
          <p>
            Seguimiento anual por familia. Las familias existentes aparecen automáticamente
            cada año; solo debes seleccionar el año y actualizar sus estados.
          </p>
        </div>
      </header>

      <section className="contributions-summary" aria-label="Resumen de aportes">
        <SummaryCard label="Total familias" value={summary.totalFamilies} />
        <SummaryCard label="CEPA pagada" value={summary.cepaPaid} positive />
        <SummaryCard label="CEPA pendiente" value={summary.cepaPending} />
        <SummaryCard label="Solidaria pagada" value={summary.solidarityPaid} positive />
        <SummaryCard label="Solidaria pendiente" value={summary.solidarityPending} />
        <SummaryCard label="Completamente al día" value={summary.fullyPaid} positive />
      </section>

      <section className="contributions-filters" aria-label="Filtros">
        <label className="contributions-search">
          <FiSearch aria-hidden="true" />
          <span className="sr-only">Buscar familia o alumno</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar familia o alumno" />
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
      </section>

      {loading ? (
        <p className="contributions-page__empty" role="status">Cargando familias…</p>
      ) : items.length === 0 ? (
        <p className="contributions-page__empty">No hay familias para los filtros seleccionados.</p>
      ) : (
        <section className="contributions-grid" aria-label="Familias">
          {items.map((item) => (
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
              <ContributionBadge label="CEPA" status={item.cepa?.status} />
              <ContributionBadge label="Solidaria" status={item.solidarity?.status} />
              <button type="button" onClick={() => setSelected(item)}>
                {canManage ? "Gestionar aportes" : "Ver detalle"}
              </button>
            </article>
          ))}
        </section>
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
            <ContributionAction label="Cuota CEPA" payment={selected.cepa}
              canManage={canManage} disabled={saving}
              onPay={() => setPendingAction({ kind: "pay", type: "CEPA" })}
              onCancel={() => setPendingAction({ kind: "cancel", type: "CEPA" })} />
            <ContributionAction label="Cuota Solidaria" payment={selected.solidarity}
              canManage={canManage} disabled={saving}
              onPay={() => setPendingAction({ kind: "pay", type: "SOLIDARIA" })}
              onCancel={() => setPendingAction({ kind: "cancel", type: "SOLIDARIA" })} />
          </section>
        </div>
      )}

      <ModalConfirm
        isOpen={Boolean(pendingAction && selected)}
        title={pendingAction?.kind === "cancel" ? "Anular registro de pago" : "Confirmar pago"}
        message={pendingAction && selected
          ? pendingAction.kind === "cancel"
            ? `Se anulará la ${pendingAction.type === "CEPA" ? "Cuota CEPA" : "Cuota Solidaria"} de la familia ${selected.familyCode}. Esta acción quedará auditada.`
            : `Se marcará la ${pendingAction.type === "CEPA" ? "Cuota CEPA" : "Cuota Solidaria"} de la familia ${selected.familyCode} como pagada con fecha ${today}.`
          : ""}
        confirmLabel={pendingAction?.kind === "cancel" ? "Anular pago" : "Registrar pago"}
        cancelLabel="Volver"
        isLoading={saving}
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

const SummaryCard = ({ label, value, positive = false }: {
  label: string; value: number; positive?: boolean;
}) => <article className={positive ? "is-positive" : ""}><span>{label}</span><strong>{value}</strong></article>;

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
    {payment?.paymentDate && <small>Fecha de pago: {payment.paymentDate}</small>}
    {canManage && (paid
      ? <button type="button" className="is-danger" disabled={disabled}
          onClick={onCancel}>Anular registro de pago</button>
      : <button type="button" disabled={disabled} onClick={onPay}>Marcar como pagada</button>)}
  </article>;
};
