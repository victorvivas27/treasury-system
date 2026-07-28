import { useState, type FormEvent } from "react";
import type { AllowedPaymentMode, PaymentMode, TreasuryFilters }
  from "@/core/A-domain/entities/treasury/Treasury";
import { useAnnualFees } from "@/presentation/hooks/treasury/useAnnualFees";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./AnnualFeesPage.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });

export const AnnualFeesPage = () => {
  const fees = useAnnualFees();
  const [amount, setAmount] = useState(70000);
  const [allowedMode, setAllowedMode] = useState<AllowedPaymentMode>("AMBAS");
  const [annualDueDate, setAnnualDueDate] = useState(`${fees.year}-04-15`);
  const [firstDueDate, setFirstDueDate] = useState(`${fees.year}-04-15`);
  const [secondDueDate, setSecondDueDate] = useState(`${fees.year}-07-15`);
  const [familyId, setFamilyId] = useState(0);
  const [mode, setMode] = useState<PaymentMode>("ANUAL");
  const [filters, setFilters] = useState<TreasuryFilters>({});
  const [annulmentId, setAnnulmentId] = useState<number | null>(null);
  const [annulmentReason, setAnnulmentReason] = useState("");
  const [removePlan, setRemovePlan] = useState<{ familyId: number; code: string } | null>(null);
  const [removePlanReason, setRemovePlanReason] = useState("");

  const saveConfig = (event: FormEvent) => {
    event.preventDefault();
    void fees.saveConfig({ annualAmount: amount, allowedMode, annualDueDate,
      firstDueDate, secondDueDate });
  };

  return <main className="annual-fees-page">
    <header className="treasury-page__header">
      <p className="treasury-page__eyebrow">Tesorería</p>
      <h1>Cuota anual</h1>
      <p>Configura el año, asigna modalidades y administra las obligaciones.</p>
    </header>

    <section className="treasury-dashboard" aria-label="Resumen de cuotas">
      {fees.dataLoading ? Array.from({ length: 6 }, (_, index) =>
        <article className="treasury-dashboard-skeleton" key={index} aria-hidden="true">
          <div className="skeleton-block" /><div className="skeleton-block" />
        </article>) : <>
        <article><span>Familias</span><strong>{fees.dashboard?.totalFamilies ?? 0}</strong></article>
        <article><span>Cuota única</span><strong>{fees.dashboard?.annualFamilies ?? 0}</strong></article>
        <article><span>Dos cuotas</span><strong>{fees.dashboard?.twoInstallmentFamilies ?? 0}</strong></article>
        <article><span>Pendientes</span><strong>{fees.dashboard?.pendingObligations ?? 0}</strong></article>
        <article><span>Recaudado</span><strong>{money.format(fees.dashboard?.collectedAmount ?? 0)}</strong></article>
        <article><span>Por recaudar</span><strong>{money.format(fees.dashboard?.pendingAmount ?? 0)}</strong></article>
      </>}
    </section>

    <div className="annual-fees-grid">
      <form className="treasury-panel" onSubmit={saveConfig}>
        <h2>Configuración anual</h2>
        <label>Año<input type="number" min="2000" value={fees.year}
          onChange={event => fees.setYear(Number(event.target.value))} /></label>
        <label>Monto anual<input type="number" min="1" value={amount}
          onChange={event => setAmount(Number(event.target.value))} /></label>
        <label>Modalidades permitidas<select value={allowedMode}
          onChange={event => setAllowedMode(event.target.value as AllowedPaymentMode)}>
          <option value="AMBAS">Ambas</option><option value="ANUAL">Cuota única</option>
          <option value="DOS_CUOTAS">Dos cuotas</option>
        </select></label>
        <label>Vencimiento cuota única<input type="date" value={annualDueDate}
          onChange={event => setAnnualDueDate(event.target.value)} /></label>
        <label>Vencimiento primera cuota<input type="date" value={firstDueDate}
          onChange={event => setFirstDueDate(event.target.value)} /></label>
        <label>Vencimiento segunda cuota<input type="date" value={secondDueDate}
          onChange={event => setSecondDueDate(event.target.value)} /></label>
        <Button type="submit" label="Guardar configuración" loading={fees.loading}
          onClick={() => {}} size="medium" />
      </form>

      <section className="treasury-panel">
        <h2>Modalidad por familia</h2>
        <label>Familia<select value={familyId} disabled={fees.familiesLoading}
          onChange={event => setFamilyId(Number(event.target.value))}>
          <option value={0}>{fees.familiesLoading ? "Cargando familias..." : "Seleccionar familia"}</option>
          {fees.families.map(family => <option key={family.familiaId} value={family.familiaId}>
            {family.codigoFamilia} · {family.alumno.nombre}
          </option>)}
        </select></label>
        <label>Modalidad<select value={mode}
          onChange={event => setMode(event.target.value as PaymentMode)}>
          <option value="ANUAL">Cuota única</option>
          <option value="DOS_CUOTAS">Dos cuotas</option>
        </select></label>
        <Button label="Guardar y generar cuotas" loading={fees.loading}
          disabled={!familyId} onClick={() => void fees.assignMode(familyId, mode)
            .then(success => {
              if (success) setFamilyId(0);
            })} size="medium" />
        {fees.dataLoading
          ? <div className="skeleton-block treasury-plan-count-skeleton" aria-hidden="true" />
          : <p>{fees.plans.length} familias configuradas para {fees.year}.</p>}
        <p className="treasury-mode-help">
          Para cambiar la modalidad de una familia con pagos, anula primero todos sus pagos
          activos. Luego selecciona la nueva modalidad y guárdala; las obligaciones se
          regenerarán automáticamente.
        </p>
        <div className="treasury-plan-list" aria-label="Familias con modalidad configurada">
          {fees.dataLoading
            ? Array.from({ length: 4 }, (_, index) =>
              <article className="treasury-plan-skeleton" key={index} aria-hidden="true">
                <div><div className="skeleton-block" /><div className="skeleton-block" /></div>
                <div className="skeleton-block" />
              </article>)
            : fees.plans.length === 0
            ? <p>Aún no hay familias con modalidad configurada.</p>
            : fees.plans.map(plan => <article key={plan.id}>
                <div>
                  <strong>{plan.familyCode}</strong>
                  <span>{plan.studentName} · {plan.course}</span>
                </div>
                <div className="treasury-plan-actions">
                  <span className={`payment-mode payment-mode--${plan.mode.toLowerCase()}`}>
                    {plan.mode === "ANUAL" ? "Cuota única" : "Dos cuotas"}
                  </span>
                  <button type="button" onClick={() => {
                    setFamilyId(plan.familyId);
                    setMode(plan.mode);
                  }}>Cambiar modalidad</button>
                  <button type="button" className="is-danger"
                    onClick={() => setRemovePlan({
                      familyId: plan.familyId,
                      code: plan.familyCode,
                    })}>Quitar familia</button>
                </div>
              </article>)}
        </div>
      </section>
    </div>

    <section className="treasury-panel treasury-obligations">
      <header><h2>Obligaciones</h2>
        <div className="treasury-filters">
          <input placeholder="Curso" onChange={event =>
            setFilters(current => ({ ...current, course: event.target.value || undefined }))} />
          <select onChange={event => setFilters(current => ({ ...current,
            mode: (event.target.value || undefined) as PaymentMode | undefined }))}>
            <option value="">Todas las modalidades</option><option value="ANUAL">Anual</option>
            <option value="DOS_CUOTAS">Dos cuotas</option>
          </select>
          <select onChange={event => setFilters(current => ({ ...current,
            status: (event.target.value || undefined) as "PENDIENTE" | "PAGADA" | undefined }))}>
            <option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option>
            <option value="PAGADA">Pagada</option>
          </select>
          <Button label="Filtrar" onClick={() => void fees.refresh(filters)} size="small" />
        </div>
      </header>
      {fees.error && <p className="treasury-error" role="alert">{fees.error}</p>}
      <div className="treasury-table-wrap"><table><thead><tr><th>Familia</th><th>Curso</th>
        <th>Concepto</th><th>Vence</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{fees.dataLoading ? Array.from({ length: 8 }, (_, row) =>
          <tr key={`loading-${row}`} aria-hidden="true">
            {Array.from({ length: 7 }, (_, column) => <td key={column}>
              <div className="skeleton-block treasury-cell-skeleton" />
            </td>)}
          </tr>) : fees.obligations.map(item => <tr key={item.id}>
          <td>{item.familyCode}<small>{item.studentName}</small></td><td>{item.course}</td>
          <td>{item.concept}</td><td>{item.dueDate}</td><td>{money.format(item.amount)}</td>
          <td><span className={`fee-status fee-status--${item.status.toLowerCase()}`}>
            {item.status}</span></td>
          <td>{item.status === "PENDIENTE"
            ? <Button label="Registrar pago" size="small"
                onClick={() => void fees.pay(item.id, item.amount)} />
            : <Button label="Anular" size="small" variant="danger"
                onClick={() => setAnnulmentId(item.id)} />}</td>
        </tr>)}</tbody></table></div>
    </section>
    <ModalAlert isOpen={Boolean(fees.message)} message={fees.message} type="success"
      onClose={fees.clearMessage} />
    <ModalConfirm
      isOpen={annulmentId !== null}
      title="Anular pago de cuota"
      message="El pago quedará anulado, la obligación volverá a Pendiente y el cambio quedará auditado."
      confirmLabel="Anular pago"
      cancelLabel="Volver"
      isLoading={fees.loading}
      onCancel={() => {
        setAnnulmentId(null);
        setAnnulmentReason("");
      }}
      onConfirm={() => {
        if (annulmentId === null || !annulmentReason.trim()) return;
        void fees.annul(annulmentId, annulmentReason.trim()).then(() => {
          setAnnulmentId(null);
          setAnnulmentReason("");
        });
      }}
    >
      <label>
        Motivo de la anulación
        <textarea
          autoFocus
          maxLength={500}
          value={annulmentReason}
          onChange={event => setAnnulmentReason(event.target.value)}
          placeholder="Ej.: pago registrado por error o cambio de modalidad"
        />
      </label>
    </ModalConfirm>
    <ModalConfirm
      isOpen={removePlan !== null}
      title="Quitar familia de la cuota anual"
      message={removePlan
        ? `Se quitará la familia ${removePlan.code} y sus obligaciones de este año. La familia seguirá existiendo en el sistema.`
        : ""}
      confirmLabel="Quitar familia"
      cancelLabel="Volver"
      isLoading={fees.loading}
      onCancel={() => {
        setRemovePlan(null);
        setRemovePlanReason("");
      }}
      onConfirm={() => {
        if (!removePlan || !removePlanReason.trim()) return;
        void fees.removeFamilyPlan(removePlan.familyId, removePlanReason.trim()).then(() => {
          setRemovePlan(null);
          setRemovePlanReason("");
        });
      }}
    >
      <label>
        Motivo
        <textarea
          autoFocus
          maxLength={500}
          value={removePlanReason}
          onChange={event => setRemovePlanReason(event.target.value)}
          placeholder="Ej.: familia agregada por error"
        />
      </label>
    </ModalConfirm>
  </main>;
};
