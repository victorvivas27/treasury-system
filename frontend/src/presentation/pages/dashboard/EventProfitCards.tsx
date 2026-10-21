import { Link } from "react-router-dom";
import { IoBalloonOutline } from "react-icons/io5";

import { getDashboardResources, useDashboardResource } from "./dashboardCache";
const money = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" });

export const EventProfitCards = ({ year }: { year: number }) => {
  const resource = getDashboardResources(year).profits;
  const { data, error } = useDashboardResource(resource);
  const profits = data ?? [];
  const loading = !data && !error;
  return <section className="dashboard-event-profits" aria-label="Ganancias de eventos cerrados">
    {loading ? <p role="status">Cargando ganancias de eventos…</p> : error ?
      <p role="alert">No fue posible cargar las ganancias. <button type="button"
        onClick={() => void resource.load(true)}>Reintentar</button></p> : profits.length === 0 ?
      <p>No hay eventos con distribución confirmada en {year}.</p> : profits.map(event =>
        <article key={event.id} className="dashboard-event-profit" aria-label={event.name}>
          <span className="dashboard-event-profit__icon"><IoBalloonOutline aria-hidden="true" /></span>
          <div className="dashboard-event-profit__content">
            <span className="dashboard-event-profit__eyebrow">Evento cerrado</span>
            <h2><Link className="dashboard-card-link"
              to={`/tesoreria/stands?year=${year}&eventId=${event.id}&tab=summary`}
              aria-label={`Ver resumen de ${event.name}`}>{event.name}</Link></h2>
            <span className="dashboard-event-profit__date">{date.format(new Date(`${event.eventDate}T12:00:00`))}</span>
            <strong>{money.format(event.netProfit)}</strong>
          </div>
        </article>)}
  </section>;
};
