import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { FiCalendar, FiGift, FiStar } from "react-icons/fi";
import "./style/BirthdaySection.css";

interface BirthdaySectionProps {
  alumnos: Alumno[];
  loading?: boolean;
  today?: Date;
  maxItems?: number;
}

interface BirthdayStudent {
  alumno: Alumno;
  age: number;
  daysUntil: number;
  dateLabel: string;
  nextBirthday: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseBirthDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : { year, month, day };
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getBirthdayInfo = (alumno: Alumno, today: Date): BirthdayStudent | null => {
  const birthDate = parseBirthDate(alumno.fechaNacimiento);
  if (!birthDate) return null;

  const currentDay = startOfDay(today);
  let nextBirthday = new Date(currentDay.getFullYear(), birthDate.month - 1, birthDate.day);
  if (nextBirthday < currentDay) {
    nextBirthday = new Date(currentDay.getFullYear() + 1, birthDate.month - 1, birthDate.day);
  }

  const birthdayThisYear = new Date(currentDay.getFullYear(), birthDate.month - 1, birthDate.day);
  const age = currentDay.getFullYear() - birthDate.year - (birthdayThisYear > currentDay ? 1 : 0);
  const daysUntil = Math.round((nextBirthday.getTime() - currentDay.getTime()) / MS_PER_DAY);
  const dateLabel = nextBirthday.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

  return { alumno, age, daysUntil, dateLabel, nextBirthday };
};

const getCountdownLabel = (daysUntil: number) => {
  if (daysUntil === 0) return "Hoy cumple";
  if (daysUntil === 1) return "Falta 1 d\u00eda";
  return `Faltan ${daysUntil} d\u00edas`;
};

const getTone = (daysUntil: number) => {
  if (daysUntil === 0) return "today";
  if (daysUntil <= 7) return "soon";
  if (daysUntil <= 30) return "near";
  return "later";
};

export const BirthdaySection = ({ alumnos, loading = false, today = new Date(), maxItems = 8 }: BirthdaySectionProps) => {
  const orderedBirthdays = alumnos
    .filter((alumno) => alumno.activo !== false)
    .map((alumno) => getBirthdayInfo(alumno, today))
    .filter((birthday): birthday is BirthdayStudent => Boolean(birthday))
    .sort((a, b) => a.daysUntil - b.daysUntil || a.alumno.nombre.localeCompare(b.alumno.nombre));
  const birthdays = maxItems > 0 ? orderedBirthdays.slice(0, maxItems) : orderedBirthdays;

  return (
    <section className="birthday-section" aria-labelledby="birthday-section-title">
      <header className="birthday-section__header">
        <div>
          <span>{"Cumplea\u00f1os"}</span>
          <h2 id="birthday-section-title">{"Pr\u00f3ximos alumnos"}</h2>
        </div>
        <FiGift aria-hidden="true" />
      </header>

      {loading ? (
        <div className="birthday-section__grid" aria-label="Cargando cumpleaños">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="birthday-card birthday-card--loading" key={index}>
              <div />
              <span />
              <strong />
            </article>
          ))}
        </div>
      ) : birthdays.length > 0 ? (
        <div className="birthday-section__grid">
          {birthdays.map(({ alumno, age, daysUntil, dateLabel }, index) => {
            const tone = getTone(daysUntil);
            return (
              <article
                className={`birthday-card is-${tone} ${index === 0 ? "is-next" : ""}`}
                key={alumno.codigo ?? alumno.alumnoId}
              >
                <div className="birthday-card__icon">
                  {tone === "today" || index === 0 ? <FiStar aria-hidden="true" /> : <FiCalendar aria-hidden="true" />}
                </div>
                <div className="birthday-card__body">
                  <span>{alumno.curso}</span>
                  <h3>{alumno.nombre}</h3>
                  <p>{dateLabel} · {age} años</p>
                </div>
                <strong>{getCountdownLabel(daysUntil)}</strong>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="birthday-section__empty">{"Agrega la fecha de nacimiento para ver los pr\u00f3ximos cumplea\u00f1os."}</p>
      )}
    </section>
  );
};
