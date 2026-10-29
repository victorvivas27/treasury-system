import { FiGift } from "react-icons/fi";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { Link } from "react-router-dom";
import { birthdayResource, useDashboardResource } from "./dashboardCache";
export const NextBirthday = ({ today = new Date() }: { today?: Date }) => {
  const { data, error } = useDashboardResource(birthdayResource);
  const alumnos = data ?? [];
  const status = data ? "ready" : error ? "error" : "loading";
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthdays = alumnos.filter(alumno => alumno.activo && alumno.fechaNacimiento)
    .flatMap(alumno => {
      const [year, month, day] = alumno.fechaNacimiento!.split("-").map(Number);
      const birth = new Date(year, month - 1, day);
      if (birth.getFullYear() !== year || birth.getMonth() !== month - 1
        || birth.getDate() !== day) return [];
      let date = new Date(currentDay.getFullYear(), month - 1, day);
      if (date < currentDay) date = new Date(currentDay.getFullYear() + 1, month - 1, day);
      return [{ alumno, date }];
    }).sort((a, b) => a.date.getTime() - b.date.getTime()
      || a.alumno.nombre.localeCompare(b.alumno.nombre, "es"));
  const next = birthdays[0];
  const celebrants = birthdays.filter(item => item.date.getTime() === next?.date.getTime());
  const names = celebrants.map(item => item.alumno.nombre).join(", ");
  const isToday = status === "ready" && next?.date.getTime() === currentDay.getTime();
  const title = isToday ? "¡Hoy celebramos!" : "Próximo cumpleaños";
  const dateLabel = next?.date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });

  const detail = status === "loading"
    ? {
      name: "Cargando",
      meta: "Buscando fechas del curso",
      statusText: "Buscando cumpleaños del curso.",
    }
    : status === "error"
      ? {
        name: "Sin datos",
        meta: "No fue posible cargar la fecha",
        statusText: "No fue posible cargar el próximo cumpleaños.",
      }
      : !next
        ? {
          name: "Sin registros",
          meta: "Agrega fechas de nacimiento",
          statusText: "Sin cumpleaños registrados.",
        }
        : {
          name: names,
          meta: isToday ? "Cumple hoy" : dateLabel ?? "",
          statusText: isToday
            ? "Hoy cumple" + (celebrants.length > 1 ? "n" : "") + " años: " + names + ". ¡Muy feliz cumpleaños!"
            : "Próximo cumple: " + names + " · " + dateLabel,
        };

  return <article className={`dashboard-birthday-card ${isToday ? "is-today" : ""}`}
    aria-label={title}>
    <span className="dashboard-birthday-card__icon"><FiGift aria-hidden="true" /></span>
    <div className="dashboard-birthday-card__content">
      <h2><Link className="dashboard-card-link" to="/birthdays"
        aria-label="Ver cumpleaños del curso">{title}</Link></h2>
      <strong>{status === "loading" ? <Skeleton /> : detail.name}</strong>
      <small>{status === "loading" ? <Skeleton width="65%" /> : detail.meta}</small>
      <span className="dashboard-birthday-card__status" role="status">
        {detail.statusText}
      </span>
    </div>
  </article>;
};

