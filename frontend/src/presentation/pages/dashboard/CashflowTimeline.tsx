import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import type { TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import { buildCashflowTimeline } from "./buildCashflowTimeline";
import { CashflowMonthPopover, type CashflowDetailAnchor } from "./CashflowMonthPopover";
import "./CashflowTimeline.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function CashflowTimeline({ data, year, loading, onRefresh }: {
  data: TreasuryDashboardOverview; year: number; loading: boolean; onRefresh: () => void;
}) {
  const months = useMemo(() => buildCashflowTimeline(data, year).filter(month => month.incomes.length || month.expenses.length), [data, year]);
  const income = months.reduce((sum, month) => sum + month.income, 0);
  const expense = months.reduce((sum, month) => sum + month.expense, 0);
  const today = new Date();
  const currentMonth = today.getFullYear() === year ? today.getMonth() + 1 : undefined;
  const firstMonth = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<{ month: number; anchor: CashflowDetailAnchor } | null>(null);
  const selectedMonth = months.find(month => month.month === detail?.month);

  if (!months.length) return null;

  return <article className="dashboard-panel dashboard-panel--cashflow" aria-busy={loading}>
    <header><i className="dashboard-panel-icon"><FiTrendingUp aria-hidden="true" /></i>
      <div><h2>Ingresos y egresos en el tiempo</h2></div>
      <button className="cashflow-refresh" type="button" onClick={onRefresh} disabled={loading}
        aria-label="Actualizar flujo"><FiRefreshCw aria-hidden="true" /></button>
    </header>
    <div className="cashflow-summary" aria-label={`Resumen de flujo: ${year}`}>
      <span><Link className="cashflow-summary-action" to={`/tesoreria/ingresos?year=${year}`}><small>Ingresos</small><strong>{money.format(income)}</strong></Link></span>
      <span><Link className="cashflow-summary-action" to={`/tesoreria/gastos?year=${year}`}><small>Egresos</small><strong>{money.format(expense)}</strong></Link></span>
      <span className={income < expense ? "is-negative" : "is-positive"}>
        <button className="cashflow-summary-action" type="button" onClick={() => {
          firstMonth.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
          firstMonth.current?.focus({ preventScroll: true });
        }}><small>Balance anual</small><strong>{money.format(income - expense)}</strong></button></span>
    </div>
    <div className="flow-ribbon-legend">
      <small>Recorre el año deslizando la línea de tiempo</small></div>
    <div className="flow-ribbon-scroll" role="region" tabIndex={0}
      aria-label={`Línea de tiempo de meses con movimientos de ${year}`}>
      <div className="flow-ribbon" key={year} style={{ "--flow-month-count": months.length } as CSSProperties}>
        {months.map(month => <section key={month.month}
          className={`flow-ribbon-month${currentMonth === month.month ? " is-current" : ""}${month.income || month.expense ? " has-activity" : ""}`}
          aria-label={`${month.name} de ${year}`}>
          <FlowDetails kind="income" total={month.income} groups={month.incomes} />
          <div className="flow-ribbon-station">
            <h3><button className="flow-ribbon-month-button" type="button" aria-haspopup="dialog"
              aria-expanded={detail?.month === month.month}
              ref={month === months[0] ? firstMonth : undefined}
              aria-label={`Ver movimientos de ${month.name} de ${year}`} onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                const chart = event.currentTarget.closest(".dashboard-panel--cashflow")!.getBoundingClientRect();
                setDetail({ month: month.month, anchor: { top: rect.top, left: rect.left, right: rect.right,
                  chartTop: chart.top, chartBottom: chart.bottom, chartLeft: chart.left, chartRight: chart.right } });
              }}><span className="flow-ribbon-node" aria-hidden="true" />{month.name}<small>{currentMonth === month.month ? "Mes actual" : `${String(month.month).padStart(2, "0")} / ${year}`}</small></button></h3>
          </div>
          <FlowDetails kind="expense" total={month.expense} groups={month.expenses} />
        </section>)}
      </div>
    </div>
    {selectedMonth && <CashflowMonthPopover month={selectedMonth} year={year} anchor={detail?.anchor} onClose={() => setDetail(null)} />}
  </article>;
}

function FlowDetails({ kind, total, groups }: { kind: "income" | "expense"; total: number; groups: [string, number][] }) {
  const income = kind === "income";
  return <div className={`flow-ribbon-entry flow-ribbon-entry--${kind}${groups.length ? "" : " is-empty"}`}>
    {groups.length ? <>
      <div className="flow-ribbon-total"><small>{income ? "Ingresos" : "Egresos"}</small><strong>{money.format(total)}</strong></div>
    </> : <p>{income ? "Sin ingresos" : "Sin egresos"}</p>}
  </div>;
}
