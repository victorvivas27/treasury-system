import axios from "axios";

export const validateRecoveryEmail = (raw: string) => {
  const email = raw.trim();
  if (!email) return "Ingrese su correo electrónico";
  if (email.length > 254) return "El correo no puede superar 254 caracteres";
  const parts = email.split("@");
  const [local, domain] = parts;
  if (parts.length !== 2 || !local || !domain || local.length > 64
    || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
    || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "Ingrese un correo válido";
  }
  const labels = domain.split(".");
  return labels.length < 2 || labels.some(label => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))
    || /^\d+$/.test(labels.at(-1)!) ? "Ingrese un correo válido" : "";
};

interface RecoveryFailure {
  message: string;
  fields?: Record<string, string>;
  retryAt?: number;
}

export const passwordRecoveryFailure = (error: unknown, now = Date.now()): RecoveryFailure => {
  const generic = "No fue posible procesar la solicitud. Intenta más tarde.";
  const timeout = "El servidor tardó demasiado. Revisa tu correo antes de reintentar.";
  if (!axios.isAxiosError(error)) return { message: generic };
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? "")) return { message: timeout };
  if (!error.response) return { message: "No se pudo conectar. Revisa tu conexión e intenta nuevamente." };

  const { status, data, headers } = error.response;
  const errors = data?.errors;
  const field = (...keys: string[]) => keys.map(key => errors?.[key])
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim();
  if (status === 429) {
    const retry = headers?.["retry-after"] ?? headers?.["Retry-After"];
    const seconds = typeof retry === "number" ? retry
      : typeof retry === "string" && /^\d+$/.test(retry.trim()) ? Number(retry) : NaN;
    const date = typeof retry === "string" ? Date.parse(retry) : NaN;
    const retryAt = Number.isFinite(seconds) && seconds >= 0 ? now + Math.max(1, seconds) * 1000
      : Number.isFinite(date) && date > now ? date : now + 60_000;
    return { message: field("email", "correo") ?? "Demasiadas solicitudes. Espera un minuto antes de reintentar.", retryAt };
  }
  if (status === 408 || status === 504) return { message: timeout };
  if (status === 400 || status === 422) {
    const email = field("email", "correo");
    const organization = field("organizationId", "organization", "curso");
    return { message: email || organization ? "" : "Revisa los datos e intenta nuevamente.",
      fields: { ...(email && { email }), ...(organization && { organization }) } };
  }
  if (status === 503) return { message: field("email") ?? "El servicio de correo no está disponible. Intenta más tarde." };
  if (status >= 500) return { message: "El servidor no está disponible. Intenta más tarde." };
  if (status === 401 || status === 403) return { message: "No se pudo autorizar la solicitud. Recarga la página e intenta nuevamente." };
  return { message: generic };
};
