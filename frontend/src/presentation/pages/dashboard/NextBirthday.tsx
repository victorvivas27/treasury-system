import { useEffect, useState } from "react";
import { FiGift } from "react-icons/fi";
import { Link } from "react-router-dom";
import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";

const repository = new AlumnoRepositoryImpl();

export const NextBirthday = ({ today = new Date() }: { today?: Date }) => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    repository.getBirthdays().then(result => {
      if (active) { setAlumnos(result); setStatus("ready"); }
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);

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
  const title = isToday ? "Hoy celebramos" : "Siguiente cumpleaños";
  const dateLabel = next?.date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });

  const detail = status === "loading"
    ? { name: "Cargando", meta: "Buscando fechas del curso" }
    : status === "error"
      ? { name: "Sin datos", meta: "No fue posible cargar la fecha" }
      : !next
        ? { name: "Sin registros", meta: "Agrega fechas de nacimiento" }
        : { name: names, meta: isToday ? "Cumple hoy" : dateLabel ?? "" };

  return <article className={`dashboard-birthday-card ${isToday ? "is-today" : ""}`}
    aria-label={title}>
    <span className="dashboard-birthday-card__icon"><FiGift aria-hidden="true" /></span>
    <div className="dashboard-birthday-card__content">
      <h2><Link className="dashboard-card-link" to="/birthdays"
        aria-label="Ver cumpleaños del curso">{title}</Link></h2>
      <strong>{detail.name}</strong>
      <small>{detail.meta}</small>
    </div>
  </article>;
};

