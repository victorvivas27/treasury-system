import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { HomeInstallGuide } from "./HomeInstallGuide";
import { publicImages } from "@/shared/assets/publicImages";
import { FiArrowRight, FiBarChart2, FiCalendar, FiCheck, FiCheckCircle, FiCoffee, FiFileText, FiHeart, FiUsers } from "react-icons/fi";
import "../style/HomeFeatures.css";
import "../style/HomeTour.css";

const scenarios = [
  {
    label: "Una cuota", icon: FiCheckCircle, category: "01 / El día a día",
    title: "Una cuota, varios abonos. Todo en su lugar.",
    description: "La familia Soto tiene una cuota anual de $60.000. Ya abonó $20.000 y hoy paga otros $15.000. La directiva registra el pago y el saldo queda claro para el seguimiento del curso.",
    steps: ["Define la cuota anual del curso.", "Registra cada pago y su familia.", "Consulta lo pagado y lo que queda pendiente."],
    screen: "Seguimiento de cuota", subtitle: "Familia Soto · Cuota anual",
    amount: "$35.000", amountLabel: "abonados de $60.000", progress: 58.33,
    rows: [["Primer abono", "$20.000"], ["Segundo abono", "$15.000"], ["Saldo pendiente", "$25.000"]],
    result: "Cada abono suma. El pendiente se entiende de un vistazo.",
  },
  {
    label: "Una actividad", icon: FiCoffee, category: "02 / Los proyectos del curso",
    title: "La kermés termina. Las cuentas también cierran.",
    description: "El stand del curso vende $180.000 y tiene $45.000 de gastos. Organiza el evento, sus productos y ventas; después revisa el resultado para saber cuánto aportó la actividad.",
    steps: ["Crea el evento y organiza sus stands.", "Gestiona productos y registra las ventas.", "Revisa gastos, recaudación y liquidación."],
    screen: "Resultado de la actividad", subtitle: "Kermés escolar · Stand del curso",
    amount: "$135.000", amountLabel: "resultado después de gastos", progress: 75,
    rows: [["Ventas del stand", "$180.000"], ["Gastos de la actividad", "−$45.000"], ["Resultado", "$135.000"]],
    result: "Del primer producto vendido al resultado de la jornada.",
  },
  {
    label: "Una rendición", icon: FiFileText, category: "03 / Las cuentas claras",
    title: "Llega la reunión. Ya tienes qué contar.",
    description: "El curso recibió $350.000 en cuotas y $135.000 de la kermés. Se gastaron $120.000 en una actividad. Con ingresos y egresos registrados, la directiva puede revisar el saldo y preparar su rendición.",
    steps: ["Mantén los ingresos y egresos registrados.", "Consulta el resumen financiero del curso.", "Revisa los reportes para rendir las cuentas."],
    screen: "Resumen para la reunión", subtitle: "Movimientos del período · Saldo inicial $0",
    amount: "$365.000", amountLabel: "saldo después de movimientos", progress: null,
    rows: [["Cuotas + resultado kermés", "$485.000"], ["Gastos del curso", "−$120.000"], ["Saldo disponible", "$365.000"]],
    result: "Explica de dónde vino el dinero y en qué se utilizó.",
  },
];

const features = [
  { icon: FiUsers, title: "Familias bien organizadas", description: "Relaciona alumnos y apoderados con su familia para identificar a quién corresponde cada aporte." },
  { icon: FiBarChart2, title: "Tesorería con contexto", description: "Cuotas, aportes, ingresos y gastos reunidos para entender cómo avanzan los fondos del curso." },
  { icon: FiCalendar, title: "Actividades que suman", description: "Administra eventos y stands, desde sus productos y ventas hasta el cierre de la recaudación." },
  { icon: FiHeart, title: "Un curso que se encuentra", description: "Consulta el horario de clases y conoce la directiva, las fotos y lo que mueve a tu comunidad." },
];

export const HomeFeatures = () => {
  const [selected, setSelected] = useState(0);
  const scenario = scenarios[selected];

  return (
    <div className="home-tour">
      <section className="home-tour__section" id="casos-reales" aria-labelledby="tour-title">
        <div className="public-home__section-heading" data-home-reveal>
          <span>Así se vive en tu curso</span>
          <h2 id="tour-title">Menos cuentas sueltas.<br />Más tiempo para hacer comunidad.</h2>
          <p>Explora tres situaciones cotidianas y descubre cómo la app te acompaña en cada una.</p>
        </div>
        <div className="home-tour__choices" role="group" aria-label="Explorar casos de uso">
          {scenarios.map(({ label, icon: Icon }, index) => (
            <button key={label} type="button" aria-pressed={selected === index}
              aria-controls="home-scenario" onClick={() => setSelected(index)}>
              <Icon aria-hidden="true" />{label}<FiArrowRight aria-hidden="true" />
            </button>
          ))}
        </div>
        <div id="home-scenario" className="home-tour__scenario" aria-live="polite" aria-atomic="true">
          <div key={selected} className="home-tour__scenario-content">
            <div className="home-tour__story">
              <span className="home-tour__overline">{scenario.category}</span>
              <h3>{scenario.title}</h3><p>{scenario.description}</p>
              <ol>{scenario.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
            </div>
            <div className="home-tour__screen" aria-label={`Ejemplo ilustrativo: ${scenario.screen}`}>
              <div className="home-tour__screen-top"><span><i /><i /><i /></span><small>Ejemplo ilustrativo</small></div>
              <div className="home-tour__screen-body">
                <span className="home-tour__overline">{scenario.screen}</span>
                <h4>{scenario.subtitle}</h4>
                <strong className="home-tour__amount">{scenario.amount}</strong><p>{scenario.amountLabel}</p>
                {scenario.progress !== null && <div className="home-tour__progress" aria-hidden="true">
                  <span style={{ "--progress": `${scenario.progress}%` } as CSSProperties} />
                </div>}
                <dl>{scenario.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                <div className="home-tour__result"><FiCheckCircle aria-hidden="true" />{scenario.result}</div>
              </div>
            </div>
          </div>
        </div>
        <p className="home-tour__sample-note">Familia y montos ficticios. Estas vistas explican el flujo; no registran pagos ni movimientos reales.</p>
      </section>

      <section className="home-tour__section home-tour__roles" aria-labelledby="roles-title">
        <div className="public-home__section-heading" data-home-reveal>
          <span>Una comunidad, distintas responsabilidades</span>
          <h2 id="roles-title">Tu lugar en el curso, también en la app.</h2>
        </div>
        <div className="home-tour__role-grid">
          <article data-home-reveal>
            <span className="home-tour__overline"><FiBarChart2 aria-hidden="true" /> Para la directiva</span>
            <h3>Organiza. Registra. Rinde cuentas.</h3>
            <p>Conecta la gestión de las familias con los fondos y las actividades del curso.</p>
            <ul><li><FiCheck aria-hidden="true" />Administra alumnos, apoderados y familias.</li><li><FiCheck aria-hidden="true" />Lleva cuotas, pagos, ingresos y gastos.</li><li><FiCheck aria-hidden="true" />Gestiona eventos, stands y reportes.</li></ul>
          </article>
          <article data-home-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}>
            <span className="home-tour__overline"><FiUsers aria-hidden="true" /> Para los apoderados</span>
            <h3>Participa con más información.</h3>
            <p>Entra con tu cuenta y encuentra el espacio de tu comunidad escolar.</p>
            <ul><li><FiCheck aria-hidden="true" />Consulta tus cuotas y sube el comprobante de tu transferencia.</li><li><FiCheck aria-hidden="true" />Revisa el horario de clases del curso.</li><li><FiCheck aria-hidden="true" />Conoce la directiva y las fotos de la comunidad.</li></ul>
          </article>
        </div>
      </section>

      <section className="public-home__features" aria-labelledby="features-title">
        <div className="public-home__section-heading" data-home-reveal>
          <span>Más que una lista de pagos</span>
          <h2 id="features-title">Todo lo que hace avanzar a tu curso.</h2>
          <p>Las personas, los recursos y los momentos compartidos, en un mismo lugar.</p>
        </div>
        <div className="public-home__feature-grid">
          {features.map(({ icon: Icon, title, description }, index) => (
            <article key={title} data-home-reveal data-home-card
              style={{ "--reveal-delay": `${index * 100}ms` } as CSSProperties}>
              <span className="public-home__feature-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-tour__section home-tour__closing" aria-labelledby="start-title" data-home-reveal>
        <div className="home-tour__closing-art" aria-hidden="true">
          <img src={publicImages.communityFamilies} alt="" loading="lazy" width="104" height="104" />
          <img src={publicImages.communityGoals} alt="" loading="lazy" width="88" height="88" />
          <img src={publicImages.communityLearning} alt="" loading="lazy" width="96" height="96" />
        </div>
        <div className="home-tour__closing-copy">
        <span className="home-tour__overline">De conocerla a usarla</span>
        <h2 id="start-title">El próximo paso es entrar a tu curso.</h2>
        <p>Tu comunidad, sus proyectos y las cuentas del curso. Todo listo para encontrarse en un mismo lugar.</p>
        </div>
        <div className="home-tour__closing-access">
          <span className="home-tour__closing-access-icon"><FiUsers aria-hidden="true" /></span>
          <h3>Tu curso te espera</h3>
          <p>Inicia sesión con tu cuenta.</p>
        <Link className="home-tour__button" to="/login">Iniciar sesión <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <div className="home-tour__closing-footer">
          <p><FiCheckCircle aria-hidden="true" /><span>¿Aún no tienes acceso? Consulta a la administración de tu curso para recibir tu invitación.</span></p>
        <div className="home-tour__install"><HomeInstallGuide /></div>
        </div>
      </section>
    </div>
  );
};
