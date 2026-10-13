import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulePage } from "./SchedulePage";
const state = vi.hoisted(() => ({
  periods: [{ schoolYear: 2026, course: "1 Básico A", editable: true }], year: 2026,
  schedule: { days: [{ dayOfWeek: 1, entryTime: "12:00:00", exitTime: "16:00:00", blocks: [
    { dayOfWeek: 1, startTime: "12:00:00", endTime: "12:45:00", type: "SUBJECT", name: "Lenguaje", order: 0, color: null },
    { dayOfWeek: 1, startTime: "13:00:00", endTime: "13:15:00", type: "BREAK", name: null, order: 1, color: null },
  ] }] },
  loading: false, error: "", setYear: vi.fn(), retry: vi.fn(),
}));
const account = vi.hoisted(() => ({ user: { id: 7, rol: "USER" } }));
vi.mock("@/presentation/hooks/academic/useSchedule", () => ({ useSchedule: () => state }));
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: () => account }));
describe("Consulta del horario", () => {
  beforeEach(() => { localStorage.clear(); state.loading = false; state.error = ""; account.user.id = 7; });
  const open = () => render(<MemoryRouter><SchedulePage /></MemoryRouter>);
  it.each(["summary", "day", "table"])("muestra skeleton en la vista %s y lo retira al terminar la carga", view => {
    state.loading = true;
    localStorage.setItem("academic.schedule.view.7", view);
    const page = open();
    const loading = screen.getByRole("status", { name: "Cargando horario" });
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading.querySelectorAll(".skeleton-block").length).toBeGreaterThan(0);
    expect(loading.querySelectorAll(".schedule-day")).toHaveLength(view === "table" ? 0 : view === "day" ? 1 : 5);
    expect(screen.queryByRole("button", { name: "Desplegar Lunes" })).not.toBeInTheDocument();
    state.loading = false;
    page.rerender(<MemoryRouter><SchedulePage /></MemoryRouter>);
    expect(screen.queryByRole("status", { name: "Cargando horario" })).not.toBeInTheDocument();
  });
  it("muestra resumen por defecto, salida explícita, bloques y no edición para USER", () => {
    open();
    expect(screen.getByLabelText("Vista")).toHaveValue("summary");
    expect(screen.getAllByRole("button", { name: /^Desplegar / })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Desplegar Lunes" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Desplegar Lunes" }));
    expect(screen.getByRole("button", { name: "Plegar Lunes" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Desplegar Martes" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("16:00")).toBeInTheDocument();
    expect(screen.getByText("Lenguaje")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gestionar horario" })).not.toBeInTheDocument();
  });
  it("las tres vistas conservan los datos y recuerda la preferencia por usuario", () => {
    const page = open();
    fireEvent.change(screen.getByLabelText("Vista"), { target: { value: "day" } });
    expect(screen.getByRole("button", { name: "Desplegar Lunes" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Desplegar Lunes" }));
    expect(screen.getByText("Lenguaje")).toBeInTheDocument();
    expect(screen.getByText("16:00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Vista"), { target: { value: "table" } });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Salida 16:00")).toBeInTheDocument();
    expect(screen.getAllByText("Lenguaje").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Libre")).toHaveLength(2);
    expect(localStorage.getItem("academic.schedule.view.7")).toBe("table");
    page.unmount(); open(); expect(screen.getByLabelText("Vista")).toHaveValue("table");
  });
  it("muestra error y permite reintentar", () => {
    state.error = "No se pudo cargar"; open();
    expect(screen.getByRole("alert")).toHaveTextContent(state.error);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(state.retry).toHaveBeenCalled();
  });
  it.each([["BREAK", "Recreo"], ["LUNCH", "Almuerzo"], ["SNACK", "Colación"]])("no repite el nombre automático de %s", (type, label) => {
    const block = state.schedule.days[0].blocks[1];
    const previous = { ...block };
    block.type = type; block.name = label;
    try {
      open();
      expect(screen.getAllByText(label)).toHaveLength(1);
      fireEvent.change(screen.getByLabelText("Vista"), { target: { value: "day" } });
      expect(screen.getAllByText(label)).toHaveLength(1);
      fireEvent.change(screen.getByLabelText("Vista"), { target: { value: "table" } });
      expect(screen.getAllByText(label)).toHaveLength(1);
    } finally { Object.assign(block, previous); }
  });
  it("no transfiere la preferencia al cambiar de usuario en la misma pantalla", () => {
    const page = open();
    fireEvent.change(screen.getByLabelText("Vista"), { target: { value: "table" } });
    account.user.id = 8;
    page.rerender(<MemoryRouter><SchedulePage /></MemoryRouter>);
    expect(screen.getByLabelText("Vista")).toHaveValue("summary");
    expect(localStorage.getItem("academic.schedule.view.7")).toBe("table");
    expect(localStorage.getItem("academic.schedule.view.8")).toBe("summary");
  });
});
