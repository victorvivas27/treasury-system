import "./BrandLogo.css";

type BrandLogoProps = { className?: string; alt?: string; src?: string };

export const BrandLogo = ({
  className = "",
  alt = "Logo de Tesorería Escolar",
  src = "/icono-tesoreria-loader.png",
}: BrandLogoProps) => {
  return <span className="brand-logo-frame">
    <img className={className} src={src} alt={alt}
      decoding="sync" />
  </span>;
};
