import type { CSSProperties } from "react";
import { useState } from "react";
import { FiTrendingUp } from "react-icons/fi";
import { CashflowMonthPopover, type CashflowDetailAnchor } from "../../dashboard/CashflowMonthPopover";
import "../../dashboard/CashflowTimeline.css";

const money = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

/** Fictional movements, using the dashboard's actual timeline structure and styles. */
export function HomeCashflowPreview({ payments, year }: { payments: number; year: number }) {
  const [detail, setDetail] = useState<{ index: number; anchor: CashflowDetailAnchor } | null>(null);
  const months = [
    { name: "Marzo", income: 480000, expense: 80000, concept: "Cuotas", expenseConcept: "Insumos kermés" },
    { name: "Abril", income: 600000, expense: 120000, concept: "Cuotas y actividades", expenseConcept: "Materiales" },
    { name: "Mayo", income: 600000 + payments * 15000, expense: 240000, concept: "Cuotas y actividades", expenseConcept: "Actividad del curso" },
  ];
  const income = months.reduce((total, month) => total + month.income, 0);
  const expense = months.reduce((total, month) => total + month.expense, 0);
  const selected = detail === null ? null : months[detail.index];
  return <section className="home-dashboard__flow home-dashboard__cashflow" aria-labelledby="preview-flow-title">
    <h2 id="preview-flow-title"><FiTrendingUp aria-hidden="true" />Ingresos y egresos en el tiempo</h2>
    <div className="home-dashboard__flow-totals">
      <span>Ingresos<b className="is-income">{money(income)}</b></span>
      <span>Egresos<b className="is-expense">{money(expense)}</b></span>
      <span>Balance anual<b>{money(income - expense)}</b></span>
    </div>
    <div className="flow-ribbon-scroll">
      <div className="flow-ribbon" key={payments} style={{ "--flow-month-count": 3 } as CSSProperties}>
        {months.map((month, index) => <section className="flow-ribbon-month has-activity" key={month.name} aria-label={`${month.name} de ${year}`}>
          <div className="flow-ribbon-entry flow-ribbon-entry--income">
            <div className="flow-ribbon-total"><small>Ingresos</small><strong>{money(month.income)}</strong></div>
          </div>
          <div className="flow-ribbon-station">
            <h3><button className="flow-ribbon-month-button" type="button" aria-haspopup="dialog"
              aria-expanded={detail?.index === index}
              aria-label={`Ver movimientos de ${month.name} de ${year}`} onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                const chart = event.currentTarget.closest(".home-dashboard__cashflow")!.getBoundingClientRect();
                setDetail({ index, anchor: { top: rect.top, left: rect.left, right: rect.right,
                  chartTop: chart.top, chartBottom: chart.bottom, chartLeft: chart.left, chartRight: chart.right } });
              }}>
              <span className="flow-ribbon-node" aria-hidden="true" />{month.name}<small>{String(index + 3).padStart(2, "0")} / {year}</small>
            </button></h3>
          </div>
          <div className="flow-ribbon-entry flow-ribbon-entry--expense">
            <div className="flow-ribbon-total"><small>Egresos</small><strong>{money(month.expense)}</strong></div>
          </div>
        </section>)}
      </div>
    </div>
    {selected && <CashflowMonthPopover year={year} anchor={detail?.anchor} month={{ ...selected,
      incomes: [[selected.concept, selected.income]], expenses: [[selected.expenseConcept, selected.expense]],
    }} onClose={() => setDetail(null)} />}
  </section>;
}
