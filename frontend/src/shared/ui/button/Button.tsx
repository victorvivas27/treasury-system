
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
  className?: string;
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
  className = ''
}: ButtonProps) => {
  const displayedIcon = loading
    ? <span className="button-loader" aria-hidden="true" />
    : icon;

  return (
    <button
      type={type}
      onClick={onClick}

      className={`base-button button-${variant} size-${size} ${loading ? 'is-loading' : ''} ${className}`}
      disabled={disabled || loading}
      data-testid={testId}
    >
      <span className="button-content">
        {displayedIcon && iconPosition === 'left' && (
          <span className="button-icon button-icon--left">{displayedIcon}</span>
        )}

        {label && <span className="button-label">{label}</span>}

        {displayedIcon && iconPosition === 'right' && (
          <span className="button-icon button-icon--right">{displayedIcon}</span>
        )}
      </span>
    </button>
  );
};
