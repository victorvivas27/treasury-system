import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../button/Button";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import "./ButtonBack.css";

interface ButtonBackProps {
  label?: string;
  className?: string;
  animatedIcon?: boolean;
}

const Lottie = lazy(() => import("lottie-react").then(module => ({ default: module.Lottie })));

const BackAnimation = () => {
  const [animationData, setAnimationData] = useState<object>();
  const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (typeof fetch === "undefined") return;
    let active = true;
    fetch("/icons/Back.json")
      .then(response => {
        if (!response.ok) throw new Error("No se pudo cargar la animación de volver");
        return response.json() as Promise<object>;
      })
      .then(data => { if (active) setAnimationData(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <span className="button-back__animation" aria-hidden="true">
    {animationData
      ? <Suspense fallback={<ALUMNOS_ICONS.back />}>
          <Lottie src={animationData} autoplay={!reduceMotion} loop={!reduceMotion} />
        </Suspense>
      : <ALUMNOS_ICONS.back />}
  </span>;
};

export const ButtonBack = ({
  label = "Volver",
  className = "",
  animatedIcon = true,
}: ButtonBackProps) => {
  const navigate = useNavigate();

  return (
    <Button
      label={label}

      onClick={() => navigate(-1)}
      variant="secondary"
      size="medium"
      icon={animatedIcon ? <BackAnimation /> : <ALUMNOS_ICONS.back/>}
      iconPosition="left"
      className={`button-back ${animatedIcon ? "button-back--animated" : ""} ${className}`}

    />
  );
};
