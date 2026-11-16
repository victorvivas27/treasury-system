import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { FiGift, FiStar } from "react-icons/fi";
import {
  TbBalloon, TbBow, TbBuildingCarousel, TbCake, TbCakeRoll, TbCandle, TbCandy,
  TbConfetti, TbCookie, TbCrown, TbDeviceGamepad2, TbGift, TbGiftCard,
  TbHorseToy, TbIceCream, TbIceCream2, TbLego, TbLollipop, TbMilkshake,
  TbMusic, TbPuzzle, TbRobot, TbSparkles, TbStars,
} from "react-icons/tb";
import "./style/BirthdaySection.css";

interface BirthdaySectionProps {
  alumnos: Alumno[];
  today?: Date;
  maxItems?: number;
}

interface BirthdayStudent {
  alumno: Alumno;
  daysUntil: number;
  nextBirthday: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CELEBRATION_ICONS = [
  { name: "cake", Icon: TbCake },
  { name: "balloon", Icon: TbBalloon },
  { name: "gift", Icon: TbGift },
  { name: "confetti", Icon: TbConfetti },
  { name: "candle", Icon: TbCandle },
  { name: "candy", Icon: TbCandy },
  { name: "lollipop", Icon: TbLollipop },
  { name: "crown", Icon: TbCrown },
  { name: "stars", Icon: TbStars },
  { name: "cake-roll", Icon: TbCakeRoll },
  { name: "ice-cream", Icon: TbIceCream },
  { name: "ice-cream-bowl", Icon: TbIceCream2 },
  { name: "cookie", Icon: TbCookie },
  { name: "milkshake", Icon: TbMilkshake },
  { name: "gift-card", Icon: TbGiftCard },
  { name: "bow", Icon: TbBow },
  { name: "toy-brick", Icon: TbLego },
  { name: "toy-horse", Icon: TbHorseToy },
  { name: "puzzle", Icon: TbPuzzle },
  { name: "gamepad", Icon: TbDeviceGamepad2 },
  { name: "robot", Icon: TbRobot },
  { name: "carousel", Icon: TbBuildingCarousel },
  { name: "music", Icon: TbMusic },
  { name: "sparkles", Icon: TbSparkles },
] as const;

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

  const daysUntil = Math.round((nextBirthday.getTime() - currentDay.getTime()) / MS_PER_DAY);
  return { alumno, daysUntil, nextBirthday };
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

export const BirthdaySection = ({ alumnos, today = new Date(), maxItems = 8 }: BirthdaySectionProps) => {
  const orderedBirthdays = alumnos
    .filter((alumno) => alumno.activo !== false)
    .map((alumno) => getBirthdayInfo(alumno, today))
    .filter((birthday): birthday is BirthdayStudent => Boolean(birthday))
    .sort((a, b) => a.daysUntil - b.daysUntil || a.alumno.nombre.localeCompare(b.alumno.nombre));
  const birthdays = maxItems > 0 ? orderedBirthdays.slice(0, maxItems) : orderedBirthdays;
  // Identity order keeps decorations stable when the source or birthday order changes.
  // Each complete round uses the entire collection before repeating an icon.
  const iconsByStudent = new Map([...birthdays]
    .sort((a, b) => String(a.alumno.codigo ?? a.alumno.alumnoId)
      .localeCompare(String(b.alumno.codigo ?? b.alumno.alumnoId), "es", { numeric: true }))
    .map((birthday, index) => [birthday.alumno.codigo ?? birthday.alumno.alumnoId,
      CELEBRATION_ICONS[index % CELEBRATION_ICONS.length]] as const));

  return (
    <section className="birthday-section" aria-labelledby="birthday-section-title">
      <header className="birthday-section__header">
        <div>
          <h2 id="birthday-section-title">{"Pr\u00f3ximos cumplea\u00f1os"}</h2>
        </div>
        <FiGift aria-hidden="true" />
      </header>

      {birthdays.length > 0 ? (
        <div className="birthday-section__grid">
          {birthdays.map((birthday, index) => {
            const { alumno, daysUntil, nextBirthday } = birthday;
            const tone = getTone(daysUntil, index);
            const { Icon, name } = iconsByStudent.get(alumno.codigo ?? alumno.alumnoId) ?? CELEBRATION_ICONS[0];
            return (
              <article
                className={`birthday-card is-${tone} ${index === 0 ? "is-next" : ""}`}
                key={alumno.codigo ?? alumno.alumnoId}
              >
                <header className="birthday-card__header">
                  <time className="birthday-card__date"
                    dateTime={`${nextBirthday.getFullYear()}-${String(nextBirthday.getMonth() + 1).padStart(2, "0")}-${String(nextBirthday.getDate()).padStart(2, "0")}`}
                    aria-label={nextBirthday.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}>
                    <strong>{nextBirthday.getDate()}</strong>
                    <span>{nextBirthday.toLocaleDateString("es-CL", { month: "short" })}</span>
                  </time>
                  <span className="birthday-card__occasion">{daysUntil === 0 ? "¡Hoy celebramos!" : index === 0 ? "El próximo festejo" : "Próximo cumpleaños"}</span>
                  <Icon className="birthday-card__illustration" data-celebration-icon={name} aria-hidden="true" />
                </header>
                <h3 className="birthday-card__name">{alumno.nombre}</h3>
                <p className="birthday-card__countdown">
                  {daysUntil === 0 && <FiStar aria-hidden="true" />}
                  <strong>{getCountdownLabel(daysUntil)}</strong>
                </p>
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
