import type { FC } from "react";
import "./FeedbackState.css";
import { Button } from "../button/Button";
interface FeedbackStateProps {
  title?: string;
  message: string;
  onRefresh?: () => void;
  type?: "error" | "info" | "warning";
}

export const FeedbackState: FC<FeedbackStateProps> = ({
  title = "Hubo un problema",
  message,
  onRefresh,
  type = "error"
}) => {
  return (
    <section className={`feedback-state feedback-state--${type}`}>
      <div className="feedback-state__container">
        <h2 className="feedback-state__title">{title}</h2>
        <p className="feedback-state__message">{message}</p>

        {onRefresh && (

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
