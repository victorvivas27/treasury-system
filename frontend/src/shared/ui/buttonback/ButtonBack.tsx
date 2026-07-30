import { useNavigate } from "react-router-dom";
import { Button } from "../button/Button";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import "./ButtonBack.css";

interface ButtonBackProps {
  label?: string;
  className?: string;
}

export const ButtonBack = ({
  label = "Volver",
  className = ""
}: ButtonBackProps) => {
  const navigate = useNavigate();

  return (
    <Button
      label={label}

      onClick={() => navigate(-1)}
      variant="secondary"
      size="medium"
      icon={<ALUMNOS_ICONS.back/>}
      iconPosition="left"
      className={`button-back ${className}`}

    />
  );
};
