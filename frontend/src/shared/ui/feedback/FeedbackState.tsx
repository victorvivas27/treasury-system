import type { FC } from "react";
import "./FeedbackState.css";
import { Button } from "../button/Button";
interface FeedbackStateProps {
  title?: string;
  message: string;
  actionText?: string;
  onRefresh?: () => void;
  type?: "error" | "info" | "warning";
  icon?: React.ReactNode;
}

export const FeedbackState: FC<FeedbackStateProps> = ({
  title = "Hubo un problema",
  actionText,
  message,
  onRefresh,
  type = "error",
  icon

}) => {
  return (
    <section className={`feedback-state feedback-state--${type}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <div className="feedback-state__container">
        <h2 className="feedback-state__title">{title}</h2>
        <p className="feedback-state__message">{message}</p>

        {actionText && onRefresh && (

          <Button
            label="Intentar de nuevo"
            onClick={onRefresh}
            size="medium"
            variant="danger"
          />

        )}
      </div>
    </section>
  );
};
