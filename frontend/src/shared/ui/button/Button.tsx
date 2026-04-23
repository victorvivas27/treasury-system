
import './Button.css';

interface ButtonProps {
  label?: string; // Ahora es opcional (puede ser solo icono)
  onClick: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode; // Icono opcional
  iconPosition?: 'left' | 'right'; // Posición del icono
  loading?: boolean;
  disabled?: boolean;
  testId?: string;
}

export const Button = ({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  testId
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`base-button button-${variant} size-${size}`}
      disabled={disabled || loading}
      data-testid={testId}
    >
      {loading ? (
        <span className="button-loader"></span>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="button-icon button-icon--left">{icon}</span>}
          {label && <span className="button-label">{label}</span>}
          {icon && iconPosition === 'right' && <span className="button-icon button-icon--right">{icon}</span>}
        </>
      )}
    </button>
  );
};
