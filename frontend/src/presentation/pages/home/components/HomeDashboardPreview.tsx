import { useState, type ReactNode } from "react";
import { FiActivity, FiCheckCircle, FiChevronDown, FiClock, FiDollarSign,
  FiGift, FiLogIn, FiLogOut, FiMessageSquare, FiPieChart, FiUsers } from "react-icons/fi";
import { MdBoy, MdGirl } from "react-icons/md";
import "../style/HomeDashboardPreview.css";
import { useEffect, useRef } from "react";
import { usePreviewDemo } from "../hooks/usePreviewDemo";
import { HomeCashflowPreview } from "./HomeCashflowPreview";

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
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = Number(previous.current.replace(/\D/g, ""));
    const to = Number(value.replace(/\D/g, ""));
    previous.current = value;
    if (from === to || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const update = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 1000, 1);
      const amount = Math.round(from + (to - from) * (1 - (1 - progress) ** 3));
      setDisplay(`${value.startsWith("$") ? "$" : ""}${amount.toLocaleString("es-CL")}`);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <div className={`home-dashboard__metric ${tone ? `is-${tone}` : ""}`}>
    <span>{label}{icon}</span><strong>{display}</strong>
  </div>;
}

export function HomeDashboardPreview() {
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const { viewport, eligible, step } = usePreviewDemo(setActivePanel);
  const payments = eligible ? step : 0;
  const money = (amount: number) => `$${amount.toLocaleString("es-CL")}`;
  const year = new Date().getFullYear();
  return <div ref={viewport} className="home-dashboard public-home__preview-enter" data-home-preview-reveal
    role="region" tabIndex={0} aria-label="Vista previa del dashboard de la app con datos ficticios">
    <header className="home-dashboard__header">
      <div><span>Vista previa · Datos ficticios</span><strong>Hola, María</strong></div>
      <div><span>Año escolar</span><b>{year}<FiChevronDown aria-hidden="true" /></b></div>
    </header>
    <div className="home-dashboard__summary">
      <section className="home-dashboard__money" aria-label="Dinero del curso">
        <h2>Dinero del curso</h2><div>
          <Metric label="Saldo disponible" value={money(1240000 + payments * 15000)} icon={<FiDollarSign />} tone="income" />
          <Metric label="Ingresos totales" value={money(1680000 + payments * 15000)} icon={<FiLogIn />} tone="income" />
          <Metric label="Egresos activos" value="$440.000" icon={<FiLogOut />} tone="expense" />
        </div>
      </section>
      <section className="home-dashboard__fees" aria-label="Cuotas del curso">
        <h2>Cuotas del curso</h2><div>
          <Metric label="Cuotas pagadas" value={String(37 + payments)} icon={<FiCheckCircle />} />
          <Metric label="Cuotas pendientes" value={String(7 - payments)} icon={<FiClock />} />
        </div>
      </section>
    </div>
    <section className="home-dashboard__course" aria-label="Nuestro curso">
      <Metric label="Familias activas" value="32" icon={<FiUsers />} />
      <div className="home-dashboard__students"><span><FiUsers aria-hidden="true" />Alumnos activos <b>34</b></span>
        <small><span><MdBoy aria-hidden="true" />18 niños</span><span><MdGirl aria-hidden="true" />16 niñas</span></small></div>
      <div className="home-dashboard__birthday"><FiGift aria-hidden="true" /><div><span>Próximo cumpleaños</span><b>Martina</b><small>8 de junio</small></div></div>
    </section>
    <HomeCashflowPreview payments={payments} year={year} />
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
