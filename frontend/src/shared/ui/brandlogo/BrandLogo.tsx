import { useState } from "react";
import "./BrandLogo.css";

type BrandLogoProps = { className?: string; alt?: string };

export const BrandLogo = ({
  className = "",
  alt = "Logo del Sistema de Tesorería",
}: BrandLogoProps) => {
  const [loaded, setLoaded] = useState(false);
  return <span className={`brand-logo-frame ${loaded ? "is-loaded" : ""}`}>
    {!loaded && <span className="skeleton-block brand-logo-skeleton" aria-hidden="true" />}
    <img className={className} src="/Tesoreria.png" alt={alt}
      onLoad={() => setLoaded(true)} />
  </span>;
};
