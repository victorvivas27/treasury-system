import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiCalendar, FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiFilter,
  FiLayers, FiRefreshCw, FiSave, FiSettings, FiSlash, FiTrendingUp, FiUsers,
  FiXCircle }
  from "react-icons/fi";
import type { AllowedPaymentMode, PaymentMode, TreasuryFilters }
  from "@/core/A-domain/entities/treasury/Treasury";
import { useAnnualFees } from "@/presentation/hooks/treasury/useAnnualFees";
import { Button } from "@/shared/ui/button/Button";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { Pagination } from "@/shared/ui/pagination/Pagination";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./AnnualFeesPage.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP",
  maximumFractionDigits: 0 });
const today = (() => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
})();
const isOverdue = (status: string, dueDate: string) => status === "PENDIENTE" && dueDate < today;
const PLAN_PAGE_SIZE = 2;

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
  const [payment, setPayment] = useState<{ id: number; amount: number; concept: string } | null>(null);
  const [paymentDate, setPaymentDate] = useState(today);
  const [annulmentId, setAnnulmentId] = useState<number | null>(null);
  const [annulmentReason, setAnnulmentReason] = useState("");
  const [removePlan, setRemovePlan] = useState<{ familyId: number; code: string } | null>(null);
  const [removePlanReason, setRemovePlanReason] = useState("");
  const [planPage, setPlanPage] = useState(1);
  const [configOpen, setConfigOpen] = useState(false);
  const currentConfig = fees.configs.find(config => config.year === fees.year);
  const planPages = Math.max(1, Math.ceil(fees.plans.length / PLAN_PAGE_SIZE));
  const visiblePlans = useMemo(() => fees.plans.slice(
    (planPage - 1) * PLAN_PAGE_SIZE, planPage * PLAN_PAGE_SIZE),
    [fees.plans, planPage]);
  const courses = useMemo(() => [...new Set([
    ...fees.plans.map(plan => plan.course),
    ...fees.obligations.map(obligation => obligation.course),
  ].filter(Boolean))].sort((first, second) => first.localeCompare(second, "es", {
    numeric: true,
  })), [fees.plans, fees.obligations]);
  const obligationGroups = useMemo(() => [...fees.obligations.reduce((groups, obligation) => {
    const current = groups.get(obligation.familyId) ?? [];
    current.push(obligation);
    groups.set(obligation.familyId, current);
    return groups;
  }, new Map<number, typeof fees.obligations>()).values()], [fees.obligations]);

  useEffect(() => {
    setPlanPage(current => Math.min(current, planPages));
  }, [planPages]);

  useEffect(() => {
    setPlanPage(1);
  }, [fees.year]);

  useEffect(() => {
    if (currentConfig) {
      setAmount(currentConfig.annualAmount);
      setAllowedMode(currentConfig.allowedMode);
      setAnnualDueDate(currentConfig.annualDueDate);
      setFirstDueDate(currentConfig.firstDueDate);
      setSecondDueDate(currentConfig.secondDueDate);
      return;
    }
    setAmount(70000);
    setAllowedMode("AMBAS");
    setAnnualDueDate(`${fees.year}-04-15`);
    setFirstDueDate(`${fees.year}-04-15`);
    setSecondDueDate(`${fees.year}-07-15`);
  }, [currentConfig, fees.year]);

  const saveConfig = async (event: FormEvent) => {
    event.preventDefault();
    const success = await fees.saveConfig({ annualAmount: amount, allowedMode, annualDueDate,
      firstDueDate, secondDueDate });
    if (success) setConfigOpen(false);
  };

  return <main className="annual-fees-page annual-fees-config-page">
    <header className="treasury-page__header">
      <h1>Cuota anual</h1>
      <p>Configura el año, asigna modalidades y administra las obligaciones.</p>
    </header>

    <section className="treasury-dashboard" aria-label="Resumen de cuotas">
      {fees.dataLoading ? Array.from({ length: 6 }, (_, index) =>
        <article className="treasury-dashboard-skeleton" key={index} aria-hidden="true">
          <div className="skeleton-block" /><div className="skeleton-block" />
        </article>) : <>
        <article className="treasury-summary-card treasury-summary-card--families">
          <div><span>Familias</span><i><FiUsers aria-hidden="true" /></i></div>
          <strong>{fees.dashboard?.totalFamilies ?? 0}</strong>
        </article>
        <article className="treasury-summary-card treasury-summary-card--annual">
          <div><span>Cuota única</span><i><FiCalendar aria-hidden="true" /></i></div>
          <strong>{fees.dashboard?.annualFamilies ?? 0}</strong>
        </article>
        <article className="treasury-summary-card treasury-summary-card--installments">
          <div><span>Dos cuotas</span><i><FiLayers aria-hidden="true" /></i></div>
          <strong>{fees.dashboard?.twoInstallmentFamilies ?? 0}</strong>
        </article>
        <article className="treasury-summary-card treasury-summary-card--pending">
          <div><span>Pendientes</span><i><FiClock aria-hidden="true" /></i></div>
          <strong>{fees.dashboard?.pendingObligations ?? 0}</strong>
        </article>
        <article className="treasury-summary-card treasury-summary-card--collected">
          <div><span>Recaudado</span><i><FiTrendingUp aria-hidden="true" /></i></div>
          <strong>{money.format(fees.dashboard?.collectedAmount ?? 0)}</strong>
        </article>
        <article className="treasury-summary-card treasury-summary-card--receivable">
          <div><span>Por recaudar</span><i><FiDollarSign aria-hidden="true" /></i></div>
          <strong>{money.format(fees.dashboard?.pendingAmount ?? 0)}</strong>
        </article>
      </>}
    </section>

    <div className="annual-fees-grid">
      <section className="treasury-panel treasury-config-launcher">
        <div>
          <span className={currentConfig ? "is-configured" : "is-unconfigured"}>
            {currentConfig ? <FiCheckCircle /> : <FiXCircle />}
          </span>
          <div><h2>Configuración anual</h2>
            <p>{currentConfig ? `${fees.year} configurado` : `${fees.year} sin configurar`}</p></div>
        </div>
        <button type="button"
          className={currentConfig ? "config-button is-configured" : "config-button is-unconfigured"}
          onClick={() => setConfigOpen(true)}>
          <FiSettings aria-hidden="true" />
          {currentConfig ? "Editar configuración" : "Configurar año"}
        </button>
      </section>

      <section className="treasury-panel treasury-family-mode-panel">
        <h2>Modalidad por familia</h2>
        <label>Familia<select value={familyId} disabled={fees.familiesLoading}
          onChange={event => setFamilyId(Number(event.target.value))}>
          <option value={0}>{fees.familiesLoading ? "Cargando familias..." : "Seleccionar familia"}</option>
          {fees.families.map(family => <option key={family.familiaId} value={family.familiaId}>
            {family.apoderados.find(item => item.relacion.esPrincipal)?.nombre
              ?? "Sin apoderado principal"}
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
            ? Array.from({ length: 2 }, (_, index) =>
              <article className="treasury-plan-skeleton" key={index} aria-hidden="true">
                <div><div className="skeleton-block" /><div className="skeleton-block" /></div>
                <div className="skeleton-block" />
              </article>)
            : fees.plans.length === 0
            ? <p>Aún no hay familias con modalidad configurada.</p>
            : visiblePlans.map(plan => <article key={plan.id}>
                <div>
                  <strong>{plan.primaryGuardian || "Sin apoderado principal"}</strong>
                  <span>{plan.familyCode} · Alumno: {plan.studentName} · {plan.course}</span>
                </div>
                <div className="treasury-plan-actions">
                  <span className={`payment-mode payment-mode--${plan.mode.toLowerCase()}`}>
                    {plan.mode === "ANUAL" ? "Cuota única" : "Dos cuotas"}
                  </span>
                  <button type="button" className="change-mode-button" onClick={() => {
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
          {!fees.dataLoading && fees.plans.length > 0
            && Array.from({ length: PLAN_PAGE_SIZE - visiblePlans.length }, (_, index) =>
              <article className="treasury-plan-placeholder" aria-hidden="true"
                key={`empty-plan-${index}`}>
                <div><strong>&nbsp;</strong><span>&nbsp;</span></div>
                <div className="treasury-plan-actions">
                  <span className="payment-mode">&nbsp;</span>
                  <button type="button">Cambiar modalidad</button>
                  <button type="button">Quitar familia</button>
                </div>
              </article>)}
        </div>
        {!fees.dataLoading && planPages > 1 && <Pagination currentPage={planPage}
          totalPages={planPages} hasPrevious={planPage > 1} hasNext={planPage < planPages}
          onPrevious={() => setPlanPage(page => page - 1)}
          onNext={() => setPlanPage(page => page + 1)}
          ariaLabel="Paginación de familias configuradas" />}
      </section>
    </div>

    <section className="treasury-panel treasury-obligations">
      <header><h2>Obligaciones</h2>
        <div className="treasury-filters">
          <select aria-label="Curso" value={filters.course ?? ""} onChange={event =>
            setFilters(current => ({ ...current, course: event.target.value || undefined }))}>
            <option value="">Todos los cursos</option>
            {courses.map(course => <option value={course} key={course}>{course}</option>)}
          </select>
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
          <Button label="Filtrar" onClick={() => void fees.refresh(filters)} size="small"
            icon={<FiFilter />} iconPosition="left" />
          <Button label="Limpiar filtros" variant="secondary" size="small"
            icon={<FiRefreshCw />} iconPosition="left"
            onClick={() => {
              setFilters({});
              void fees.refresh({});
            }} />
        </div>
      </header>
      {fees.error && <p className="treasury-error" role="alert">{fees.error}</p>}
      <div className="treasury-table-wrap"><table><thead><tr><th>Responsable</th><th>Curso</th>
        <th>Concepto</th><th>Vence</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{fees.dataLoading ? Array.from({ length: 8 }, (_, row) =>
          <tr key={`loading-${row}`} aria-hidden="true">
            {Array.from({ length: 7 }, (_, column) => <td key={column}>
              <div className="skeleton-block treasury-cell-skeleton" />
            </td>)}
          </tr>) : fees.obligations.map(item => <tr key={item.id}>
          <td className="obligation-card__responsible" data-label="Responsable">
            <strong>{item.primaryGuardian || "Sin apoderado principal"}</strong>
            <small>{item.familyCode} · Alumno: {item.studentName}</small></td>
          <td className="obligation-card__course" data-label="Curso">{item.course}</td>
          <td className="obligation-card__concept" data-label="Concepto">{item.concept}</td>
          <td className="obligation-card__due" data-label="Vence">{item.dueDate}</td>
          <td className="obligation-card__amount" data-label="Monto">{money.format(item.amount)}</td>
          <td className="obligation-card__status" data-label="Estado">
            <span className={`fee-status fee-status--${isOverdue(item.status, item.dueDate)
              ? "vencida" : item.status.toLowerCase()}`}>
            {isOverdue(item.status, item.dueDate) ? "VENCIDA" : item.status}</span></td>
          <td className="obligation-card__action">{item.status === "PENDIENTE"
            ? <Button label="Registrar pago" size="small" icon={<FiCreditCard />}
                iconPosition="left"
                onClick={() => {
                  setPaymentDate(today);
                  setPayment({ id: item.id, amount: item.amount, concept: item.concept });
                }} />
            : <Button label="Anular" size="small" variant="danger" icon={<FiSlash />}
                iconPosition="left"
                onClick={() => setAnnulmentId(item.id)} />}</td>
        </tr>)}</tbody></table></div>
      <div className="obligation-family-cards" aria-label="Obligaciones por familia">
        {fees.dataLoading
          ? Array.from({ length: 3 }, (_, index) => <article key={index} aria-hidden="true">
              <div className="skeleton-block dashboard-row-skeleton" />
              <div className="skeleton-block dashboard-row-skeleton" />
            </article>)
          : obligationGroups.map(items => {
            const family = items[0];
            return <article className="obligation-family-card" key={family.familyId}>
              <header>
                <div><strong>{family.primaryGuardian || "Sin apoderado principal"}</strong>
                  <span>Alumno: {family.studentName} · {family.course}</span></div>
                <span className={`payment-mode payment-mode--${family.mode.toLowerCase()}`}>
                  {family.mode === "ANUAL" ? "Cuota única" : "Dos cuotas"}
                </span>
              </header>
              <div className="obligation-installments">
                {items.map(item => <section key={item.id}
                  className={isOverdue(item.status, item.dueDate) ? "is-overdue" : ""}>
                  <div className="obligation-installment__title">
                    <strong>{item.concept}</strong>
                    <span className={`fee-status fee-status--${isOverdue(item.status, item.dueDate)
                      ? "vencida" : item.status.toLowerCase()}`}>
                      {isOverdue(item.status, item.dueDate) ? "VENCIDA" : item.status}</span>
                  </div>
                  <dl>
                    <div><dt>Vence</dt><dd>{item.dueDate}</dd></div>
                    <div><dt>Monto</dt><dd>{money.format(item.amount)}</dd></div>
                  </dl>
                  {item.status === "PENDIENTE"
                    ? <Button label="Registrar pago" size="small" icon={<FiCreditCard />}
                        iconPosition="left"
                        onClick={() => {
                          setPaymentDate(today);
                          setPayment({ id: item.id, amount: item.amount, concept: item.concept });
                        }} />
                    : <Button label="Anular" size="small" variant="danger" icon={<FiSlash />}
                        iconPosition="left"
                        onClick={() => setAnnulmentId(item.id)} />}
                </section>)}
              </div>
            </article>;
          })}
      </div>
    </section>
    {configOpen && <aside className="annual-config-modal" role="dialog" aria-modal="true"
      aria-labelledby="annual-config-title" onClick={() => !fees.loading && setConfigOpen(false)}>
      <form className="treasury-panel treasury-config-form" onSubmit={saveConfig}
        onClick={event => event.stopPropagation()}>
        <header><h2 id="annual-config-title">Configuración anual</h2>
          <button type="button" aria-label="Cerrar" disabled={fees.loading}
            onClick={() => setConfigOpen(false)}>×</button></header>
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
          onClick={() => {}} size="medium" icon={<FiSave />} iconPosition="left" />
      </form>
    </aside>}
    <ModalAlert isOpen={Boolean(fees.message)} message={fees.message} type="success"
      onClose={fees.clearMessage} autoCloseTime={2000} variant="toast" />
    <ModalAlert isOpen={Boolean(fees.actionError)} message={fees.actionError} type="error"
      title="No se pudo guardar la modalidad" buttonLabel="Entendido" autoCloseTime={0}
      onClose={fees.clearActionError} />
    <ModalConfirm
      isOpen={payment !== null}
      title="Registrar pago de cuota"
      message={payment ? `Selecciona la fecha real del pago de ${payment.concept}.` : ""}
      confirmLabel="Registrar pago"
      cancelLabel="Volver"
      isLoading={fees.loading}
      confirmDisabled={!paymentDate}
      compact
      onCancel={() => setPayment(null)}
      onConfirm={() => {
        if (!payment || !paymentDate) return;
        void fees.pay(payment.id, paymentDate, payment.amount).then(success => {
          if (success) setPayment(null);
        });
      }}
    >
      <label>
        Fecha de pago
        <input type="date" value={paymentDate} max={today}
          onChange={event => setPaymentDate(event.target.value)} autoFocus />
      </label>
    </ModalConfirm>
    <ModalConfirm
      isOpen={annulmentId !== null}
      title="Anular pago de cuota"
      message="El pago quedará anulado, la obligación volverá a Pendiente y el cambio quedará auditado."
      confirmLabel="Anular pago"
      cancelLabel="Volver"
      isLoading={fees.loading}
      compact
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
