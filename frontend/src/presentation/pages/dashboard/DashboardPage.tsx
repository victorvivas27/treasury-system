import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ContributionSummary,
  TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { expenseCategoryLabel } from "@/shared/constants/ExpenseConstants";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import "@/shared/ui/skeletonwrapper/SkeletonWrapper.css";
import "./DashboardPage.css";

const repository = new TreasuryRepositoryImpl();
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, index) => 2026 + index);
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("es-CL", { notation: "compact" });
const monthName = (month: number) => new Intl.DateTimeFormat("es-CL", { month: "short" })
  .format(new Date(2026, month - 1, 1)).replace(".", "");

export const DashboardPage = () => {
  const auth = useOptionalAuth();
  const user = auth?.user;
  const isAdmin = user?.rol === "ADMIN";
  const [year, setYear] = useState(years.includes(currentYear) ? currentYear : 2026);
  const [data, setData] = useState<TreasuryDashboardOverview>();
  const [contributions, setContributions] = useState<ContributionSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAudits, setSelectedAudits] = useState<Set<number>>(new Set());
  const [cleanup, setCleanup] = useState<"selected" | "all" | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [cleanupError, setCleanupError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, contributionSummary] = await Promise.all([
        repository.dashboardOverview(year),
        repository.contributionSummary(year),
      ]);
      setData(overview);
      setContributions(contributionSummary);
      setSelectedAudits(new Set());
    } catch {
      setData(undefined);
      setContributions(undefined);
      setError("No fue posible cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  const monthly = useMemo(() => data?.monthlyCashFlow.map(item => ({
    ...item, name: monthName(item.month),
  })) ?? [], [data]);
  const categories = useMemo(() => data?.expensesByCategory.slice(0, 6).map(item => ({
    ...item, name: expenseCategoryLabel(item.category),
  })) ?? [], [data]);

  const clearAudits = async () => {
    if (!cleanup) return;
    try {
      await repository.clearAudits(year, [...selectedAudits], cleanup === "all");
      setCleanupMessage(cleanup === "all"
        ? `Se limpiaron todas las trazas de ${year}.`
        : `Se limpiaron ${selectedAudits.size} trazas seleccionadas.`);
      setCleanup(null);
      await load();
    } catch {
      setCleanup(null);
      setCleanupError("No fue posible limpiar las trazas.");
    }
  };

  const toggleAudit = (id: number) => setSelectedAudits(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (error && !loading) {
    return <FeedbackState message={error} onRefresh={() => void load()} />;
  }

  return <main className="business-dashboard">
    <header className="business-dashboard__header">
      <div><span>Vista general</span><h1>Dashboard</h1>
        <p>Estado financiero y actividad real del curso.</p></div>
      <label>Año escolar<select value={year}
        onChange={event => setYear(Number(event.target.value))}>
        {years.map(item => <option key={item}>{item}</option>)}
      </select></label>
    </header>

    {loading ? <DashboardSkeleton /> : data && <>
      <section className="dashboard-kpis" aria-label="Indicadores principales">
        <Kpi label="Ingresos totales" value={money.format(data.finances.totalIncome)} positive />
        <Kpi label="Egresos activos" value={money.format(data.finances.totalExpenses)} negative />
        <Kpi label="Saldo disponible" value={money.format(data.finances.availableBalance)}
          negative={data.finances.availableBalance < 0} positive={data.finances.availableBalance >= 0} />
        <Kpi label="Cuotas pagadas" value={String(data.quotas.paidObligations)} />
        <Kpi label="Cuotas pendientes" value={String(data.quotas.pendingObligations)} />
      </section>

      <section className="dashboard-charts">
        <article className="dashboard-panel dashboard-panel--wide">
          <header><div><span>Flujo mensual</span><h2>Ingresos extraordinarios y egresos</h2></div></header>
          <div className="dashboard-chart" aria-label="Evolución mensual">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="dashboardIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={value => compact.format(value)} />
                <Tooltip formatter={(value) => money.format(Number(value))}
                  contentStyle={{ background: "var(--color-elevated)", borderColor: "var(--border-color)" }} />
                <Legend />
                <Area name="Ingresos" dataKey="income" stroke="var(--color-success)"
                  fill="url(#dashboardIncome)" />
                <Area name="Egresos" dataKey="expense" stroke="var(--color-error)"
                  fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel">
          <header><div><span>Cuota anual</span><h2>Estado de obligaciones</h2></div></header>
          {data.obligationStatus.every(item => item.count === 0)
            ? <p className="dashboard-empty">No hay obligaciones registradas.</p>
            : <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.obligationStatus}>
                <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" />
                <XAxis dataKey="status" stroke="var(--text-muted)" />
                <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                <Tooltip cursor={{ fill: "transparent" }}
                  contentStyle={{ background: "var(--color-elevated)",
                    borderColor: "var(--border-color)", color: "var(--text-main)" }}
                  labelStyle={{ color: "var(--text-main)" }}
                  itemStyle={{ color: "var(--text-main)" }} />
                <Bar name="Obligaciones" dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.obligationStatus.map(item => <Cell key={item.status}
                    fill={item.status === "PAGADA"
                      ? "var(--color-success)" : "var(--color-warning)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}
        </article>

        <article className="dashboard-panel">
          <header><div><span>Distribución</span><h2>Egresos por categoría</h2></div></header>
          {categories.length === 0 ? <p className="dashboard-empty">No hay egresos activos.</p>
            : <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical">
                  <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="var(--text-muted)"
                    tickFormatter={value => compact.format(value)} />
                  <YAxis type="category" dataKey="name" width={90} stroke="var(--text-muted)" />
                  <Tooltip cursor={{ fill: "transparent" }}
                    formatter={(value) => money.format(Number(value))}
                    contentStyle={{ background: "var(--color-elevated)",
                      borderColor: "var(--border-color)", color: "var(--text-main)" }}
                    labelStyle={{ color: "var(--text-main)" }}
                    itemStyle={{ color: "var(--text-main)" }} />
                  <Bar name="Monto" dataKey="amount" fill="var(--color-warning)"
                    radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
        </article>

        <article className="dashboard-panel dashboard-panel--wide dashboard-contributions">
          <header><div><span>Aportes del curso</span>
            <h2>Cuota CEPA y Cuota Solidaria</h2>
            <p>Porcentaje de familias pagadas y pendientes durante {year}.</p></div></header>
          {contributions && contributions.totalFamilies > 0
            ? <div className="contribution-donuts">
              <ContributionDonut title="Cuota CEPA"
                paid={contributions.cepaPaid} pending={contributions.cepaPending} />
              <ContributionDonut title="Cuota Solidaria"
                paid={contributions.solidarityPaid}
                pending={contributions.solidarityPending} />
            </div>
            : <p className="dashboard-empty">No hay familias para calcular los aportes.</p>}
        </article>
      </section>

      {isAdmin && <section className="dashboard-panel dashboard-activity">
        <header><div><span>Últimos registros</span><h2>Actividad reciente</h2></div></header>
        {data.recentMovements.length === 0 ? <p className="dashboard-empty">
          No hay movimientos registrados para {year}.</p> : <div className="dashboard-table-wrap">
          <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th>
            <th>Estado</th><th>Monto</th><th>Detalle</th></tr></thead>
            <tbody>{data.recentMovements.map(item => <tr key={`${item.type}-${item.id}`}>
              <td><span className={`movement-type movement-type--${item.type.toLowerCase()}`}>
                {item.type === "INGRESO" ? "Ingreso" : "Egreso"}</span></td>
              <td>{item.description}</td><td>{new Date(`${item.date}T00:00:00`)
                .toLocaleDateString("es-CL")}</td>
              <td>{item.status === "ACTIVE" ? "Activo" : "Anulado"}</td>
              <td className={item.type === "INGRESO" ? "is-positive" : "is-negative"}>
                {item.type === "INGRESO" ? "+" : "-"}{money.format(item.amount)}</td>
              <td><Link to={item.type === "INGRESO"
                ? "/tesoreria/ingresos" : "/tesoreria/gastos"}>Abrir</Link></td>
            </tr>)}</tbody></table>
        </div>}
      </section>}

      {isAdmin && <section className="dashboard-panel dashboard-audit">
        <header><div><span>Historial del sistema</span><h2>Trazas de Tesorería</h2>
          <p>Registro de creaciones, modificaciones, anulaciones y pagos.</p></div>
          {data.auditTrail.length > 0 && <div className="audit-actions">
            <button disabled={selectedAudits.size === 0}
              onClick={() => setCleanup("selected")}><FiTrash2 /> Limpiar seleccionadas</button>
            <button className="is-danger" onClick={() => setCleanup("all")}>
              <FiTrash2 /> Limpiar todo {year}</button>
          </div>}
        </header>
        {data.auditTrail.length === 0 ? <p className="dashboard-empty">
          No hay trazas registradas para {year}.</p> : <div className="dashboard-table-wrap">
          <table><thead><tr>
            <th className="audit-checkbox">
              <input type="checkbox" aria-label="Seleccionar todas las trazas visibles"
                checked={selectedAudits.size === data.auditTrail.length}
                onChange={event => setSelectedAudits(event.target.checked
                  ? new Set(data.auditTrail.map(item => item.id)) : new Set())} />
            </th>
            <th>Acción</th><th>Tipo</th><th>Detalle</th><th>Usuario</th><th>Fecha</th>
          </tr></thead><tbody>{data.auditTrail.map(item => <tr key={item.id}>
            <td className="audit-checkbox"><input type="checkbox"
              aria-label={`Seleccionar traza ${item.id}`} checked={selectedAudits.has(item.id)}
              onChange={() => toggleAudit(item.id)} /></td>
            <td>{item.action.replaceAll("_", " ")}</td><td>{item.entityType}</td>
            <td>{item.details || `Registro ${item.entityId}`}</td><td>{item.performedBy}</td>
            <td>{new Date(item.createdAt).toLocaleString("es-CL")}</td>
          </tr>)}</tbody></table>
        </div>}
      </section>}
    </>}
    {isAdmin && <ModalConfirm isOpen={cleanup !== null} title="Limpiar trazas"
      message={cleanup === "all"
        ? `Se eliminará definitivamente todo el historial de Tesorería de ${year}.`
        : `Se eliminarán definitivamente ${selectedAudits.size} trazas seleccionadas.`}
      confirmLabel="Sí, limpiar" onConfirm={() => void clearAudits()}
      onCancel={() => setCleanup(null)} />}
    <ModalAlert isOpen={Boolean(cleanupMessage)} type="success"
      message={cleanupMessage} onClose={() => setCleanupMessage("")} />
    <ModalAlert isOpen={Boolean(cleanupError)} type="error"
      message={cleanupError} onClose={() => setCleanupError("")} />
  </main>;
};

const Kpi = ({ label, value, positive = false, negative = false }: {
  label: string; value: string; positive?: boolean; negative?: boolean;
}) => <article><span>{label}</span><strong className={positive ? "is-positive"
  : negative ? "is-negative" : ""}>{value}</strong></article>;

const ContributionDonut = ({ title, paid, pending }: {
  title: string; paid: number; pending: number;
}) => {
  const total = paid + pending;
  const percentage = total === 0 ? 0 : Math.round((paid * 100) / total);
  const chartData = [
    { name: "Pagado", value: paid, color: "var(--color-success)" },
    { name: "Pendiente", value: pending, color: "var(--color-warning)" },
  ];
  return <article className="contribution-donut">
    <h3>{title}</h3>
    <div className="contribution-donut__chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58}
          outerRadius={88} paddingAngle={2}>
          {chartData.map(item => <Cell key={item.name} fill={item.color} />)}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} familias`, name]}
          contentStyle={{ background: "var(--color-elevated)",
            borderColor: "var(--border-color)", color: "var(--text-main)" }}
          itemStyle={{ color: "var(--text-main)" }} />
        </PieChart>
      </ResponsiveContainer>
      <strong>{percentage}%<small>pagado</small></strong>
    </div>
    <p>{paid} pagadas · {pending} pendientes</p>
  </article>;
};

const DashboardSkeleton = () => <div className="dashboard-loading" role="status"
  aria-label="Cargando dashboard">
  <section className="dashboard-kpis">{Array.from({ length: 5 }, (_, index) =>
    <article key={index}><div className="skeleton-block" />
      <div className="skeleton-block" /></article>)}</section>
  <section className="dashboard-charts">{Array.from({ length: 3 }, (_, index) =>
    <article className={`dashboard-panel ${index === 0 ? "dashboard-panel--wide" : ""}`}
      key={index}><div className="skeleton-block dashboard-title-skeleton" />
      <div className="skeleton-block dashboard-chart-skeleton" /></article>)}</section>
  <article className="dashboard-panel"><div className="skeleton-block dashboard-title-skeleton" />
    {Array.from({ length: 5 }, (_, index) =>
      <div className="skeleton-block dashboard-row-skeleton" key={index} />)}</article>
</div>;
