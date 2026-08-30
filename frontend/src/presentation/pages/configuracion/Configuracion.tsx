import { useEffect, useMemo, useState } from "react";
import { FiBell, FiBookOpen, FiCheck, FiCompass, FiMonitor, FiMoon, FiSave,
  FiSun } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import type { ThemePreference } from "@/presentation/context/theme";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { OPEN_APP_TOUR_EVENT } from "@/shared/ui/apptour/AppTour";
import { useOptionalNotifications } from "@/presentation/context/NotificationContext";
import "./Configuracion.css";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof FiMoon;
}> = [
  {
    value: "dark",
    label: "Oscuro",
    description: "Utiliza colores oscuros y reduce el brillo general de la interfaz.",
    icon: FiMoon,
  },
  {
    value: "light",
    label: "Claro",
    description: "Utiliza una apariencia clara y suave, evitando fondos blancos intensos.",
    icon: FiSun,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Adapta la aplicación a la configuración de tu dispositivo.",
    icon: FiMonitor,
  },
];

export const Configuracion = () => {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const auth = useOptionalAuth();
  const notifications = useOptionalNotifications();
  const pushStatus = notifications?.pushStatus ?? "unsupported";
  const pushLoading = notifications?.pushLoading ?? false;
  const repository = useMemo(() => new TreasuryRepositoryImpl(), []);
  const selectedOption = THEME_OPTIONS.find(({ value }) => value === themePreference)!;
  const [savedCourse, setSavedCourse] = useState("1A");
  const [course, setCourse] = useState("1A");
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear());
  const [savedSchoolYear, setSavedSchoolYear] = useState(new Date().getFullYear());
  const [courseHistory, setCourseHistory] = useState<Array<{
    course: string; schoolYear: number;
  }>>([]);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [confirmCourse, setConfirmCourse] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canEditCourse = isAdminRole(auth?.user?.rol);
  const pushCopy = {
    checking: ["Comprobando…", "Estamos revisando la configuración de este dispositivo."],
    unsupported: ["No compatible", "Este navegador o dispositivo no permite notificaciones web."],
    unavailable: ["No disponible", "El servidor todavía no tiene configuradas las claves Web Push."],
    prompt: ["Desactivadas", "Actívalas para recibir avisos y ver el contador sobre el ícono."],
    denied: ["Permiso bloqueado", "Habilita las notificaciones desde los ajustes del dispositivo."],
    enabled: ["Activadas", "Recibirás avisos aunque la aplicación esté cerrada."],
  }[pushStatus];

  useEffect(() => {
    if (!canEditCourse) {
      setLoadingCourse(false);
      return;
    }
    repository.getManagedCourseSettings()
      .then(value => {
        setSavedCourse(value.course);
        setCourse(value.course);
        setSchoolYear(value.schoolYear);
        setSavedSchoolYear(value.schoolYear);
        setCourseHistory(value.history);
      })
      .catch(() => setError("No fue posible cargar el curso administrado."))
      .finally(() => setLoadingCourse(false));
  }, [repository, canEditCourse]);

  const saveCourse = async () => {
    setConfirmCourse(false);
    try {
      const saved = await repository.saveManagedCourse(course, schoolYear);
      setSavedCourse(saved.course);
      setCourse(saved.course);
      setSchoolYear(saved.schoolYear);
      setSavedSchoolYear(saved.schoolYear);
      setCourseHistory(saved.history);
      window.dispatchEvent(new CustomEvent("managed-course-changed", { detail: saved }));
      setMessage(`El período vigente cambió a ${saved.course} · ${saved.schoolYear}.`);
    } catch {
      setError("No fue posible cambiar el curso administrado.");
    }
  };

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-header">
        <p className="settings-eyebrow">Preferencias</p>
        <h1 id="settings-title">Configuración</h1>
        <p>Personaliza tu experiencia en la plataforma.</p>
      </header>

      <article className="appearance-card">
        <div className="appearance-heading">
          <div>
            <h2>Apariencia</h2>
            <p>Tema de la aplicación</p>
          </div>
          <span className="resolved-theme" aria-live="polite">
            Tema activo: {resolvedTheme === "dark" ? "oscuro" : "claro"}
          </span>
        </div>

        <fieldset className="theme-selector">
          <legend>Elige cómo deseas visualizar la plataforma.</legend>
          <div className="theme-options">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = themePreference === value;
              return (
                <label className={`theme-option${selected ? " selected" : ""}`} key={value}>
                  <input
                    checked={selected}
                    name="app-theme"
                    onChange={() => setThemePreference(value)}
                    type="radio"
                    value={value}
                  />
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  <FiCheck className="theme-check" aria-hidden="true" />
                  <span className="sr-only">{selected ? "Seleccionado" : ""}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <p className="theme-description">{selectedOption.description}</p>
      </article>

      <article className="guided-tour-card">
        <FiCompass aria-hidden="true" />
        <div>
          <h2>Recorrido guiado</h2>
          <p>Vuelve a revisar las funciones principales de la aplicación paso a paso.</p>
        </div>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_APP_TOUR_EVENT))}>
          Ver recorrido
        </button>
      </article>

      <article className={`push-settings-card push-settings-card--${pushStatus}`}>
        <span className="push-settings-icon"><FiBell aria-hidden="true" /></span>
        <div>
          <h2>Notificaciones del dispositivo</h2>
          <strong>{pushCopy[0]}</strong>
          <p>{pushCopy[1]}</p>
        </div>
        {pushStatus === "enabled" ? <button type="button" disabled={pushLoading}
          onClick={() => void notifications?.disablePush().catch(() => setError(
            "No fue posible desactivar las notificaciones en este dispositivo."))}>
          {pushLoading ? "Desactivando…" : "Desactivar"}
        </button> : <button type="button"
          disabled={pushLoading || ["checking", "unsupported", "unavailable", "denied"].includes(pushStatus)}
          onClick={() => void notifications?.enablePush().catch((reason: unknown) => setError(reason instanceof Error
            ? reason.message : "No fue posible activar las notificaciones."))}>
          {pushLoading ? "Activando…" : "Activar"}
        </button>}
      </article>

      {canEditCourse && <article className="managed-course-card">
        <div className="managed-course-heading">
          <FiBookOpen aria-hidden="true" />
          <div><h2>Curso administrado</h2>
            <p>Define el curso que gestiona esta instalación completa de Tesorería.</p></div>
          <strong>{savedCourse} · {schoolYear}</strong>
        </div>
        <label htmlFor="managed-course">Curso actual</label>
        <div className="managed-course-form">
          <input id="managed-course" maxLength={80} value={course}
            onChange={event => setCourse(event.target.value.toUpperCase())}
            placeholder="Ejemplo: 1A" />
          <label className="managed-course-year" htmlFor="managed-school-year">
            <span>Año lectivo</span>
            <input id="managed-school-year" type="number" min={2000} max={2100}
              value={schoolYear} onChange={event => setSchoolYear(Number(event.target.value))} />
          </label>
          <button type="button"
            disabled={loadingCourse || !course.trim() || schoolYear < 2000 || schoolYear > 2100
              || (course.trim() === savedCourse && schoolYear === savedSchoolYear)}
            onClick={() => setConfirmCourse(true)}><FiSave /> Actualizar curso</button>
        </div>
        <p className="managed-course-help">El nuevo período se aplicará a las operaciones futuras.
          Los movimientos ya registrados conservarán su año y curso históricos.</p>
        {courseHistory.length > 0 && <div className="managed-course-history">
          <span>Historial de períodos</span>
          <ul>{courseHistory.map(period => <li key={period.schoolYear}>
            <strong>{period.schoolYear}</strong><span>{period.course}</span>
          </li>)}</ul>
        </div>}
      </article>}

      {canEditCourse && <ModalConfirm isOpen={confirmCourse} title="Actualizar período lectivo"
        message={`La administración pasará de ${savedCourse} · ${savedSchoolYear} a ${course.trim().toUpperCase()} · ${schoolYear}. Los datos históricos no cambiarán.`}
        confirmLabel="Sí, actualizar" onConfirm={() => void saveCourse()}
        onCancel={() => setConfirmCourse(false)} />}
      <ModalAlert isOpen={Boolean(message)} type="success" message={message}
        onClose={() => setMessage("")} />
      <ModalAlert isOpen={Boolean(error)} type="error" message={error}
        onClose={() => setError("")} />
    </section>
  );
};
