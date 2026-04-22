
import './Button.css';

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary'| 'danger';
  size?: 'small' | 'medium' | 'large';
  testId?: string;
}

export const Button = ({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'small',
  testId
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`base-button button-${variant} size-${size}`}
      data-testid={testId}
    >
      {label}
    </button>
  );
};
