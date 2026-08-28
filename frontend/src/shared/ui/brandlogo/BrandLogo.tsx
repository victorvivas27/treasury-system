import "./BrandLogo.css";

type BrandLogoProps = { className?: string; alt?: string };

export const BrandLogo = ({
  className = "",
  alt = "Logo de Tesorería Escolar",
}: BrandLogoProps) => {
  return <span className="brand-logo-frame">
    <img className={className} src="/icono-tesoreria-loader.png" alt={alt}
      decoding="sync" />
  </span>;
};
