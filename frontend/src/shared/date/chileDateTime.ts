const CHILE_TIME_ZONE = "America/Santiago";

const hasExplicitZone = (value: string) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

export const chileDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: CHILE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(date);

export const chileTime = (value: string) => {
  if (!hasExplicitZone(value)) {
    const match = value.match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
  }
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};
