import { useEffect, useState } from "react";
import { FiGift } from "react-icons/fi";
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
  const names = birthdays.filter(item => item.date.getTime() === next?.date.getTime())
    .map(item => item.alumno.nombre).join(", ");

  return <div className="dashboard-next-birthday" role="status">
    <FiGift aria-hidden="true" />
    <span>{status === "loading" ? "Cargando próximo cumpleaños…"
      : status === "error" ? "No fue posible cargar el próximo cumpleaños."
      : !next ? "Sin cumpleaños registrados."
      : <>{next.date.getTime() === currentDay.getTime() ? "Hoy cumple: " : "Próximo cumple: "}
        <b>{names}</b>{" · "}
        {next.date.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}</>}</span>
  </div>;
};
