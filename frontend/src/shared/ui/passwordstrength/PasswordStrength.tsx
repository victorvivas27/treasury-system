import { FiCheckCircle, FiCircle } from "react-icons/fi";
import "./PasswordStrength.css";

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const REQUIREMENTS = [
  { label: "Mínimo 8 caracteres", matches: (value: string) => value.length >= 8 },
  { label: "Una mayúscula", matches: (value: string) => /[A-Z]/.test(value) },
  { label: "Una minúscula", matches: (value: string) => /[a-z]/.test(value) },
  { label: "Un número", matches: (value: string) => /\d/.test(value) },
  { label: "Un carácter especial", matches: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const PasswordStrength = ({ password, id }: { password: string; id: string }) => {
  const completed = REQUIREMENTS.filter((rule) => rule.matches(password)).length;
  const strength = !password ? "empty" : PASSWORD_PATTERN.test(password) ? "strong"
    : completed >= 3 ? "medium" : "weak";
  const label = { empty: "Sin evaluar", weak: "Débil", medium: "Media", strong: "Fuerte" }[strength];

  return (
    <div id={id} className="password-strength">
      <p className="password-strength__summary" data-strength={strength} role="status">
        Fortaleza orientativa: <strong>{label}</strong>
      </p>
      <ul className="password-strength__requirements" aria-label="Condiciones de la contraseña">
        {REQUIREMENTS.map((rule) => {
          const met = rule.matches(password);
          return (
            <li key={rule.label} className={met ? "is-met" : ""}>
              {met ? <FiCheckCircle aria-hidden="true" /> : <FiCircle aria-hidden="true" />}
              <span>{rule.label}</span>
              <span className="password-strength__status">{met ? ": cumplido" : ": pendiente"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
