import "./EmptyState.css";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No hay datos disponibles",
  message = "No se encontraron registros para mostrar.",
  icon,
  actionText,
  onAction,
}) => {
  return (
    <section className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__message">{message}</p>
      
      {actionText && onAction && (
        <button className="empty-state__button" onClick={onAction}>
          {actionText}
        </button>
      )}
    </section>
  );
};
