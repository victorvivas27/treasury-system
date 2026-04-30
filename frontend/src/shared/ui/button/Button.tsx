
import './Button.css';

interface ButtonProps {
  label?: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'none' | 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  testId?: string;
  className?: string; // 1. Agregamos la prop opcional
}

export const Button = ({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'none',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  testId,
  className = '' // 2. Le damos un valor por defecto vacío
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      // 3. Concatenamos la clase externa al final
      className={`base-button button-${variant} size-${size} ${loading ? 'is-loading' : ''} ${className}`}
      disabled={disabled || loading}
      data-testid={testId}
    >
      <span className="button-content">
        {icon && iconPosition === 'left' && (
          <span className="button-icon button-icon--left">{icon}</span>
        )}

        {label && <span className="button-label">{label}</span>}

        {icon && iconPosition === 'right' && (
          <span className="button-icon button-icon--right">{icon}</span>
        )}
      </span>
    </button>
  );
};
