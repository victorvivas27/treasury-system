import "./StatusToggleButton.css";

interface StatusToggleButtonProps {
  active: boolean;
  entityLabel: string;
  onToggle: () => void;
}

export const StatusToggleButton = ({ active, entityLabel, onToggle }: StatusToggleButtonProps) => {
  const action = active ? "Desactivar" : "Reactivar";
  const accessibleLabel = `${action} ${entityLabel}`;

  return (
    <span className="status-toggle-button">
      <button type="button"
        className={`status-toggle-button__control ${active ? "is-active" : "is-inactive"}`}
        onClick={onToggle} aria-label={accessibleLabel}
        role="switch" aria-checked={active}>
        <span className="status-toggle-button__thumb" aria-hidden="true" />
      </button>
    </span>
  );
};
