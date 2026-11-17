import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./Breadcrumbs";

const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}>
  <Breadcrumbs />
  <Routes>
    <Route path="/" element={<p>Home de destino</p>} />
    <Route path="/dashboard" element={<p>Resumen de destino</p>} />
    <Route path="/students" element={<p>Lista de destino</p>} />
    <Route path="*" element={null} />
  </Routes>
</MemoryRouter>);

describe("Ruta de navegación", () => {
  it("marca Pagos como página actual y permite volver al resumen de Tesorería", () => {
    mount("/tesoreria/pagos?year=2026#pendientes");
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(nav).getByText("Pagos")).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Pagos" })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("link", { name: "Tesorería" }));
    expect(screen.getByText("Resumen de destino")).toBeInTheDocument();
    expect(within(nav).getByText("Tesorería")).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByText("Pagos")).not.toBeInTheDocument();
  });

  it("muestra el formulario de edición sin exponer el identificador y permite volver a la lista", () => {
    mount("/students/edit/AL-12345678");
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(nav).not.toHaveTextContent("AL-12345678");
    expect(within(nav).getByText("Editar alumno")).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Gestión" })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("link", { name: "Alumnos" }));
    expect(screen.getByText("Lista de destino")).toBeInTheDocument();
  });

  it.each([
    ["/admin/arquitectura", "Administración", "Arquitectura del sistema"],
    ["/calendario/horario-clases", "Calendario académico", "Horario de clases"],
    ["/family/new", "Gestión", "Nueva familia"],
  ])("identifica %s sin inventar enlaces para las agrupaciones", (path, group, current) => {
    mount(path);
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(within(nav).getByText(current)).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: group })).not.toBeInTheDocument();
  });

  it.each(["/", "/login", "/desconocida/123"])('no inventa una ruta para "%s"', path => {
    mount(path);
    expect(screen.queryByRole("navigation", { name: "Ruta de navegación" })).not.toBeInTheDocument();
  });
});
