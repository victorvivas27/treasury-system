import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackIcon } from "@/shared/ui/back-icon/BackIcon";
import { Button } from "../button/Button";
import { ALUMNOS_ICONS } from "@/shared/constants/Icons";
import "./ButtonBack.css";

interface ButtonBackProps {
  label?: string;
  className?: string;
  animatedIcon?: boolean;
}

const loadPlayer = () => import("lottie-react").then(module => ({ default: module.Lottie }));
const Lottie = lazy(loadPlayer);

// The animation's first frame, available immediately without a network request.
const ARROW_PATH = "M11.285-9.06V9.102C11.285 12.032 8.081 13.833 5.577 12.311L-8.868 3.533C-11.234 2.095-11.285-1.319-8.963-2.827L5.482-12.21C7.981-13.833 11.285-12.04 11.285-9.06Z";
const BackFirstFrame = () => <svg className="button-back__preview" viewBox="0 0 64 64" fill="white"
  aria-hidden="true">
  <path d={ARROW_PATH} transform="translate(26.94 31.959)" />
  <path d={ARROW_PATH} transform="translate(39.949 31.999)" />
</svg>;

const BackAnimation = ({ className = "" }: { className?: string }) => {
  const [animationData, setAnimationData] = useState<object>();
  const [ready, setReady] = useState(false);
  const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (typeof fetch === "undefined") return;
    let active = true;
    const data = fetch("/icons/Back.json")
      .then(response => {
        if (!response.ok) throw new Error("No se pudo cargar la animación de volver");
        return response.json() as Promise<object>;
      });
    Promise.all([loadPlayer(), data])
      .then(([, animation]) => { if (active) setAnimationData(animation); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <span className={`button-back__animation ${className}`.trim()} aria-hidden="true">
    {!ready && <BackFirstFrame />}
    {animationData && <Suspense fallback={null}>
      <Lottie src={animationData} autoplay={!reduceMotion} loop={!reduceMotion}
        subscriptions={{ ready: () => setReady(true) }} />
    </Suspense>}
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
      icon={animatedIcon ? <BackIcon desktopIcon={<BackAnimation />} /> : <ALUMNOS_ICONS.back/>}
      iconPosition="left"
      className={`button-back ${animatedIcon ? "button-back--animated" : ""} ${className}`}

    />
  );
};
