import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { useEffect, useRef, useState } from "react";
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

const getTone = (daysUntil: number, index: number) => {
  if (daysUntil === 0) return "today";
  return `tone-${(index % 10) + 1}`;
};

export const BirthdaySection = ({ alumnos, loading = false, today = new Date(), maxItems = 8 }: BirthdaySectionProps) => {
  const [selectedBirthday, setSelectedBirthday] = useState<BirthdayStudent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selectedBirthday) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [selectedBirthday]);
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
          <h2 id="birthday-section-title">{"Pr\u00f3ximos cumplea\u00f1os"}</h2>
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
          {birthdays.map((birthday, index) => {
            const { alumno, age, daysUntil, dateLabel } = birthday;
            const tone = getTone(daysUntil, index);
            return (
              <article
                className={`birthday-card is-${tone} ${index === 0 ? "is-next" : ""}`}
                key={alumno.codigo ?? alumno.alumnoId}
              >
                <div className="birthday-card__icon">
                  {tone === "today" || index === 0 ? <FiStar aria-hidden="true" /> : <FiCalendar aria-hidden="true" />}
                </div>
                <div className="birthday-card__body">
                  <h3><span className="birthday-card__full-name">{alumno.nombre}</span><span className="birthday-card__first-name">{alumno.nombre.trim().split(/\s+/)[0]}</span></h3>
                  <p>{dateLabel} · {age} años</p>
                  <div className="birthday-card__desktop-details">
                    <p>Cumple {birthday.nextBirthday.getFullYear() - Number(alumno.fechaNacimiento?.slice(0, 4))} años</p>
                    <BirthdayFacts birthday={birthday} />
                  </div>
                </div>
                <strong>{getCountdownLabel(daysUntil)}</strong>
                <button type="button" className="birthday-card__more" aria-label={`Ver más de ${alumno.nombre}`}
                  onClick={() => setSelectedBirthday(birthday)}>Ver más</button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="birthday-section__empty">{"Agrega la fecha de nacimiento para ver los pr\u00f3ximos cumplea\u00f1os."}</p>
      )}
      {selectedBirthday && <dialog ref={dialogRef} className="birthday-details" aria-labelledby="birthday-details-title"
        onCancel={event => { event.preventDefault(); setSelectedBirthday(null); }}
        onClick={event => { if (event.target === event.currentTarget) setSelectedBirthday(null); }}>
        <header className="birthday-details__header">
          <div className="birthday-details__date" aria-hidden="true"><strong>{selectedBirthday.nextBirthday.getDate()}</strong><span>{selectedBirthday.nextBirthday.toLocaleDateString("es-CL", { month: "short" })}</span></div>
          <div className="birthday-details__occasion"><span>{selectedBirthday.daysUntil === 0 ? "¡Hoy celebramos!" : "Próximo cumpleaños"}</span>
            <strong>Cumple {selectedBirthday.nextBirthday.getFullYear() - Number(selectedBirthday.alumno.fechaNacimiento?.slice(0, 4))} años</strong>
            <small>{getCountdownLabel(selectedBirthday.daysUntil)}</small></div>
          <FiGift className="birthday-details__gift" aria-hidden="true" />
        </header>
        <h2 id="birthday-details-title">{selectedBirthday.alumno.nombre}</h2>
        <BirthdayFacts birthday={selectedBirthday} />
        <button type="button" className="birthday-details__close" onClick={() => setSelectedBirthday(null)}>Cerrar</button>
      </dialog>}
    </section>
  );
};

function BirthdayFacts({ birthday }: { birthday: BirthdayStudent }) {
  return <dl className="birthday-facts">
    <div><dt>Fecha de nacimiento</dt><dd>{new Date(`${birthday.alumno.fechaNacimiento}T00:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
    <div><dt>Edad actual</dt><dd>{birthday.age} años</dd></div>
    <div><dt>Próximo cumpleaños</dt><dd>{birthday.nextBirthday.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
  </dl>;
}
