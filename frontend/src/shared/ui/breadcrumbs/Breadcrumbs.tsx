import { Link, matchPath, useLocation } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { SIDEBAR_FOOTER_LINKS, SIDEBAR_LINKS, TREASURY_LINKS } from "@/shared/constants/Icons";
import "./Breadcrumbs.css";

interface Crumb {
  label: string;
  to?: string;
}

const treasury: Crumb = { label: "Tesorería", to: "/dashboard" };
const management: Crumb = { label: "Gestión" };
const administration: Crumb = { label: "Administración" };
const peoplePaths = new Set(["/students", "/parents", "/family", "/users"]);
const routes: { path: string; crumbs: Crumb[] }[] = [
  { path: "/dashboard", crumbs: [treasury] },
  ...TREASURY_LINKS.map(link => ({ path: link.path, crumbs: [treasury, { label: link.label }] })),
  ...SIDEBAR_LINKS.flatMap(section => section.links)
    .filter(link => link.path !== "/dashboard")
    .map(link => ({ path: link.path, crumbs: [
      ...(peoplePaths.has(link.path) ? [management] : []), { label: link.label },
    ] })),
  ...SIDEBAR_FOOTER_LINKS.map(link => ({ path: link.path, crumbs: [{ label: link.label }] })),
  { path: "/profile", crumbs: [{ label: "Mi perfil" }] },
  { path: "/calendario/horario-clases", crumbs: [{ label: "Calendario académico" }, { label: "Horario de clases" }] },
  { path: "/admin/horario-clases", crumbs: [management, { label: "Gestión del horario" }] },
  { path: "/admin/sobre-nosotros", crumbs: [management, { label: "Lo que nos mueve" }] },
  { path: "/admin/fotos-del-curso", crumbs: [management, { label: "Fotos del curso" }] },
  { path: "/admin/directiva", crumbs: [management, { label: "Directiva" }] },
  { path: "/admin/reportes-calidad", crumbs: [administration, { label: "Reportes de calidad" }] },
  { path: "/admin/mejoras", crumbs: [administration, { label: "Centro de mejoras" }] },
  { path: "/admin/arquitectura", crumbs: [administration, { label: "Arquitectura del sistema" }] },
  { path: "/administrations", crumbs: [{ label: "Administraciones" }] },
  ...[
    { path: "/students", label: "Alumnos", entity: "alumno" },
    { path: "/parents", label: "Apoderados", entity: "apoderado" },
    { path: "/family", label: "Familia", entity: "familia" },
  ].flatMap(({ path, label, entity }) => [
    { path: `${path}/new`, crumbs: [management, { label, to: path }, { label: `${entity === "familia" ? "Nueva" : "Nuevo"} ${entity}` }] },
    { path: `${path}/edit/:id`, crumbs: [management, { label, to: path }, { label: `Editar ${entity}` }] },
  ]),
];

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const route = routes.find(item => matchPath({ path: item.path, end: true }, pathname));
  if (!route) return null;
  const crumbs: Crumb[] = [{ label: "Inicio", to: "/" }, ...route.crumbs];

  return <nav className="breadcrumbs" aria-label="Ruta de navegación">
    <ol>
      {crumbs.map((crumb, index) => {
        const current = index === crumbs.length - 1;
        return <li key={`${index}-${crumb.label}`}>
          {index > 0 && <FiChevronRight className="breadcrumbs__separator" aria-hidden="true" />}
          {crumb.to && !current
            ? <Link to={crumb.to}>{crumb.label}</Link>
            : <span aria-current={current ? "page" : undefined}>{crumb.label}</span>}
        </li>;
      })}
    </ol>
  </nav>;
};
