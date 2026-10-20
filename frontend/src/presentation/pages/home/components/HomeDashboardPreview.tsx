import { useState, type ReactNode } from "react";
import { FiActivity, FiCheckCircle, FiChevronDown, FiClock, FiDollarSign,
  FiGift, FiLogIn, FiLogOut, FiMessageSquare, FiPieChart, FiTrendingUp, FiUsers } from "react-icons/fi";
import { MdBoy, MdGirl } from "react-icons/md";
import "../style/HomeDashboardPreview.css";

const months = [
  { name: "Marzo", income: "$480.000", expense: "$80.000", balance: "$400.000" },
  { name: "Abril", income: "$600.000", expense: "$120.000", balance: "$480.000" },
  { name: "Mayo", income: "$600.000", expense: "$240.000", balance: "$360.000" },
];
const panels = [
  { title: "Cuota anual", icon: FiPieChart, content: <>
    <div className="home-dashboard__quota"><span className="home-dashboard__donut"><b>32<small>familias</small></b></span>
      <div><p><i />Cuota única <b>20 familias</b></p><p><i />Dos cuotas <b>12 familias</b></p></div></div>
    <div className="home-dashboard__recaudacion"><span>Recaudación</span><b>$1.500.000 de $1.920.000</b>
      <div><span /></div><span>78% recaudado · Pendiente: $420.000</span></div>
  </> },
  { title: "Aportes del curso", icon: FiUsers, content: <div className="home-dashboard__contributions">
    <div><b>Cuota CEPA</b><strong>75%</strong><span>24 pagadas · 8 pendientes</span></div>
    <div><b>Fondo de Apoyo por Fallecimiento</b><strong>88%</strong><span>28 pagadas · 4 pendientes</span></div>
  </div> },
  { title: "Principales egresos", icon: FiLogOut, content: <dl>
    <div><dt>Actividad del curso</dt><dd>$240.000</dd></div>
    <div><dt>Materiales</dt><dd>$120.000</dd></div>
    <div><dt>Insumos kermés</dt><dd>$80.000</dd></div>
  </dl> },
  { title: "Actividad reciente", icon: FiActivity, content: <dl>
    <div><dt>Ingreso · Kermés escolar</dt><dd className="is-income">+$180.000</dd></div>
    <div><dt>Cuota · Familia Soto</dt><dd className="is-income">+$15.000</dd></div>
    <div><dt>Egreso · Materiales</dt><dd className="is-expense">−$120.000</dd></div>
  </dl> },
  { title: "Ganancias de eventos", icon: FiDollarSign, content: <dl>
    <div><dt>Kermés escolar</dt><dd className="is-income">$100.000</dd></div>
    <div><dt>Rifa del curso</dt><dd className="is-income">$80.000</dd></div>
  </dl> },
];

function Metric({ label, value, icon, tone }: {
  label: string; value: string; icon: ReactNode; tone?: string;
}) {
  return <div className={`home-dashboard__metric ${tone ? `is-${tone}` : ""}`}>
    <span>{label}{icon}</span><strong>{value}</strong>
  </div>;
}

export function HomeDashboardPreview() {
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const year = new Date().getFullYear();
  return <div className="home-dashboard public-home__preview-enter" data-home-preview-reveal
    role="region" tabIndex={0} aria-label="Vista previa del dashboard de la app con datos ficticios">
    <header className="home-dashboard__header">
      <div><span>Vista previa · Datos ficticios</span><strong>Hola, María</strong></div>
      <div><span>Año escolar</span><b>{year}<FiChevronDown aria-hidden="true" /></b></div>
    </header>
    <div className="home-dashboard__summary">
      <section className="home-dashboard__money" aria-label="Dinero del curso">
        <h2>Dinero del curso</h2><div>
          <Metric label="Saldo disponible" value="$1.240.000" icon={<FiDollarSign />} tone="income" />
          <Metric label="Ingresos totales" value="$1.680.000" icon={<FiLogIn />} tone="income" />
          <Metric label="Egresos activos" value="$440.000" icon={<FiLogOut />} tone="expense" />
        </div>
      </section>
      <section className="home-dashboard__fees" aria-label="Cuotas del curso">
        <h2>Cuotas del curso</h2><div>
          <Metric label="Cuotas pagadas" value="37" icon={<FiCheckCircle />} />
          <Metric label="Cuotas pendientes" value="7" icon={<FiClock />} />
        </div>
      </section>
    </div>
    <section className="home-dashboard__course" aria-label="Nuestro curso">
      <Metric label="Familias activas" value="32" icon={<FiUsers />} />
      <div className="home-dashboard__students"><span><FiUsers aria-hidden="true" />Alumnos activos <b>34</b></span>
        <small><span><MdBoy aria-hidden="true" />18 niños</span><span><MdGirl aria-hidden="true" />16 niñas</span></small></div>
      <div className="home-dashboard__birthday"><FiGift aria-hidden="true" /><div><span>Próximo cumpleaños</span><b>Martina</b><small>8 de junio</small></div></div>
    </section>
    <section className="home-dashboard__flow" aria-labelledby="preview-flow-title">
      <h2 id="preview-flow-title"><FiTrendingUp aria-hidden="true" />Ingresos y egresos en el tiempo</h2>
      <div className="home-dashboard__timeline">{months.map(month => <div key={month.name}>
        <span className="is-income">{month.income}</span><strong><i />{month.name}</strong>
        <span className="is-expense">{month.expense}</span><small>Balance <b>{month.balance}</b></small>
      </div>)}</div>
      <div className="home-dashboard__legend"><span>Ingresos</span><span>Egresos</span></div>
    </section>
    <div className="home-dashboard__panels">{panels.map(({ title, icon: Icon, content }, index) => (
      <section key={title}>
        <h2><button type="button" aria-expanded={activePanel === index} aria-controls={`preview-panel-${index}`}
          onClick={() => setActivePanel(current => current === index ? null : index)}>
          <Icon aria-hidden="true" /><span>{title}</span><FiChevronDown aria-hidden="true" />
        </button></h2>
        <div id={`preview-panel-${index}`} className="home-dashboard__panel-content" hidden={activePanel !== index}>{content}</div>
      </section>
    ))}
      <div className="home-dashboard__message"><FiMessageSquare aria-hidden="true" /><div><b>Mensaje de la directiva</b><span>¡Gracias por hacer posible cada actividad del curso!</span></div></div>
    </div>
    <p className="home-dashboard__hint">Explora los paneles para conocer los detalles <span aria-hidden="true">↑</span></p>
  </div>;
}
