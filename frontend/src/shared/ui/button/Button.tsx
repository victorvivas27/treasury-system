import { useEffect, useRef, useState } from 'react';
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
  ariaLabel?: string;
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
  className = '',
  ariaLabel,
}: ButtonProps) => {
  const isSaveAction = /^guardar\b/i.test(label ?? '');
  const startedAt = useRef<number | null>(null);
  const [holdingLoading, setHoldingLoading] = useState(false);
  useEffect(() => {
    if (!isSaveAction) { setHoldingLoading(false); startedAt.current = null; return; }
    if (loading) {
      startedAt.current = Date.now();
      setHoldingLoading(true);
      return;
    }
    if (startedAt.current === null) return;
    const remaining = Math.max(0, 700 - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => { setHoldingLoading(false); startedAt.current = null; }, remaining);
    return () => window.clearTimeout(timer);
  }, [loading, isSaveAction]);
  const visibleLoading = loading || (isSaveAction && holdingLoading);
  const displayedLabel = visibleLoading && isSaveAction ? 'Guardando…' : label;
  const displayedIcon = visibleLoading
    ? <span className="button-loader" aria-hidden="true" />
    : icon;

  return (
    <button
      type={type}
      onClick={onClick}

      className={`base-button button-${variant} size-${size} ${visibleLoading ? 'is-loading' : ''} ${className}`}
      disabled={disabled || visibleLoading}
      data-testid={testId}
      aria-label={ariaLabel}
      aria-busy={visibleLoading}
    >
      <span className="button-content">
        {displayedIcon && iconPosition === 'left' && (
          <span className="button-icon button-icon--left">{displayedIcon}</span>
        )}

        {displayedLabel && <span className="button-label">{displayedLabel}</span>}

        {displayedIcon && iconPosition === 'right' && (
          <span className="button-icon button-icon--right">{displayedIcon}</span>
        )}
      </span>
    </button>
  );
};
