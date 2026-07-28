import { useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiCheck, FiMonitor, FiMoon, FiSave, FiSun } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import type { ThemePreference } from "@/presentation/context/theme";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
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
  const repository = useMemo(() => new TreasuryRepositoryImpl(), []);
  const selectedOption = THEME_OPTIONS.find(({ value }) => value === themePreference)!;
  const [savedCourse, setSavedCourse] = useState("1A");
  const [course, setCourse] = useState("1A");
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [confirmCourse, setConfirmCourse] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canEditCourse = auth?.user?.rol === "ADMIN";

  useEffect(() => {
    if (!canEditCourse) {
      setLoadingCourse(false);
      return;
    }
    repository.getManagedCourse()
      .then(value => {
        setSavedCourse(value);
        setCourse(value);
      })
      .catch(() => setError("No fue posible cargar el curso administrado."))
      .finally(() => setLoadingCourse(false));
  }, [repository, canEditCourse]);

  const saveCourse = async () => {
    setConfirmCourse(false);
    try {
      const saved = await repository.saveManagedCourse(course);
      setSavedCourse(saved);
      setCourse(saved);
      window.dispatchEvent(new CustomEvent("managed-course-changed", { detail: saved }));
      setMessage(`El curso administrado cambió a ${saved}.`);
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

      {canEditCourse && <article className="managed-course-card">
        <div className="managed-course-heading">
          <FiBookOpen aria-hidden="true" />
          <div><h2>Curso administrado</h2>
            <p>Define el curso que gestiona esta instalación completa de Tesorería.</p></div>
          <strong>{savedCourse}</strong>
        </div>
        <label htmlFor="managed-course">Curso</label>
        <div className="managed-course-form">
          <input id="managed-course" maxLength={80} value={course}
            onChange={event => setCourse(event.target.value.toUpperCase())}
            placeholder="Ejemplo: 1A" />
          <button type="button"
            disabled={loadingCourse || !course.trim() || course.trim() === savedCourse}
            onClick={() => setConfirmCourse(true)}><FiSave /> Guardar curso</button>
        </div>
        <p className="managed-course-help">El cambio se aplicará a las operaciones nuevas.
          Los movimientos históricos conservarán el curso con el que fueron registrados.</p>
      </article>}

      {canEditCourse && <ModalConfirm isOpen={confirmCourse} title="Cambiar curso administrado"
        message={`La aplicación dejará de administrar ${savedCourse} y pasará a administrar ${course.trim().toUpperCase()}. Los datos históricos no cambiarán.`}
        confirmLabel="Sí, cambiar curso" onConfirm={() => void saveCourse()}
        onCancel={() => setConfirmCourse(false)} />}
      <ModalAlert isOpen={Boolean(message)} type="success" message={message}
        onClose={() => setMessage("")} />
      <ModalAlert isOpen={Boolean(error)} type="error" message={error}
        onClose={() => setError("")} />
    </section>
  );
};
