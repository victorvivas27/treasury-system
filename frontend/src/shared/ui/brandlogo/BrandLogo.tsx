import "./BrandLogo.css";

type BrandLogoProps = { className?: string; alt?: string };

export const BrandLogo = ({
  className = "",
  alt = "Logo del Sistema de Tesorería",
}: BrandLogoProps) => {
  return <span className="brand-logo-frame">
    <img className={className} src="/icono-tesoreria-loader.png" alt={alt}
      decoding="sync" />
  </span>;
};
