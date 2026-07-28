import { FiCheck, FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import type { ThemePreference } from "@/presentation/context/theme";
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
  const selectedOption = THEME_OPTIONS.find(({ value }) => value === themePreference)!;

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
    </section>
  );
};
