import { CardValueSkeleton, Skeleton } from "./Skeleton";

/** Use the same layout classes as the loaded content, including its mobile layout. */
export function MovementSummarySkeleton({ income = false }: { income?: boolean }) {
  const labels = income
    ? ["Saldo disponible", "Ingresos por cuotas", "Otros ingresos", "Ingresos totales", "Total de egresos"]
    : ["Saldo disponible", "Total recaudado", "Total de egresos"];
  return <section className={income ? "income-summary" : "expenses-summary"}
    role="status" aria-label="Cargando resumen financiero" aria-busy="true">
    {labels.map(label => <article className={income ? "income-summary-card" : "expense-summary-card"} key={label}>
      <div><span>{label}</span></div><strong><Skeleton width="8ch" /></strong>
    </article>)}
  </section>;
}

export function MovementListSkeleton({ income = false }: { income?: boolean }) {
  return <section className={`expenses-grid ${income ? "income-results" : "expense-results"}`}
    role="status" aria-label={income ? "Cargando ingresos" : "Cargando egresos"} aria-busy="true">
    {Array.from({ length: 4 }, (_, index) => <article className={`expense-card${income ? " income-card" : ""}`} key={index}>
      <header><span><Skeleton width="10ch" /></span></header><h2><Skeleton width="18ch" /></h2><strong><Skeleton width="8ch" /></strong>
    </article>)}
  </section>;
}

export function DashboardDataSkeleton() {
  const groups = [
    { title: "Dinero del curso", tone: "money", labels: ["Saldo disponible", "Ingresos totales", "Egresos activos"] },
    { title: "Cuotas del curso", tone: "fees", labels: ["Cuotas pagadas", "Cuotas pendientes"] },
    { title: "Nuestro curso", tone: "course", labels: ["Familias activas", "Alumnos activos"] },
  ];
  return <section className="dashboard-kpis" role="status" aria-label="Cargando indicadores del curso" aria-busy="true">
    {groups.map(group => <section className={`dashboard-summary-group dashboard-summary-group--${group.tone}`} key={group.tone}>
      <header className="dashboard-summary-group__heading"><h2>{group.title}</h2></header>
      {group.labels.map(label => <article className="dashboard-kpi" key={label}>
        <div className="dashboard-kpi__header"><span className="dashboard-kpi__label">{label}</span></div>
        <div className="dashboard-kpi__value"><strong><Skeleton width="7ch" /></strong></div>
      </article>)}
    </section>)}
  </section>;
}

export function PaymentDataSkeleton() {
  return <section className="payment-panel" role="status" aria-label="Cargando datos de pagos" aria-busy="true">
    <header><h2>Cuota del curso</h2></header>
    <div className="installment-table">
      {Array.from({ length: 2 }, (_, index) => <article className="installment-row" key={index}>
        <div className="installment-row__main"><div className="installment-row__concept"><strong><Skeleton /></strong></div>
          <Skeleton /><CardValueSkeleton /><Skeleton /></div>
      </article>)}
    </div>
  </section>;
}

export function ProfileFamilySkeleton() {
  return <section className="profile-real-data profile-family-data" role="status" aria-label="Cargando vinculación familiar" aria-busy="true">
    <header><div><span>Vinculación familiar</span><h2><Skeleton width="8ch" /></h2></div></header>
    <dl className="profile-data-grid">{["Alumno", "Parentesco", "Teléfono"].map(label =>
      <div key={label}><dt>{label}</dt><dd><Skeleton /></dd></div>)}</dl>
  </section>;
}

export function NotificationListSkeleton({ conversation = false }: { conversation?: boolean }) {
  return <div role="status" aria-label={conversation ? "Cargando conversación" : "Cargando notificaciones"} aria-busy="true">
    {Array.from({ length: 3 }, (_, index) => <article
      className={conversation ? "notification-reply" : "notification-recipient"} key={index}>
      <div><strong><Skeleton width="60%" /></strong><p><Skeleton /></p></div>
    </article>)}
  </div>;
}
