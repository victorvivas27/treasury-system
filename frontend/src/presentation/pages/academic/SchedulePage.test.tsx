import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulePage } from "./SchedulePage";
const state = vi.hoisted(() => ({
  periods: [{ schoolYear: 2026, course: "1 Básico A", editable: true }], year: 2026,
  schedule: { days: [{ dayOfWeek: 1, entryTime: "12:00:00", exitTime: "16:00:00", blocks: [
    { dayOfWeek: 1, startTime: "12:00:00", endTime: "12:45:00", type: "SUBJECT", name: "Lenguaje", order: 0, color: null },
    { dayOfWeek: 1, startTime: "13:00:00", endTime: "13:15:00", type: "BREAK", name: null, order: 1, color: null },
  ] }] },
  ready: true, loading: false, error: "", setYear: vi.fn(), retry: vi.fn(),
}));
const account = vi.hoisted(() => ({ user: { id: 7, rol: "USER" } }));
vi.mock("@/presentation/hooks/academic/usePublishedSchedule", () => ({ usePublishedSchedule: () => state }));
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: () => account }));
describe("Consulta del horario", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26, 12));
    localStorage.clear(); state.loading = false; state.ready = true; state.error = ""; account.user.id = 7;
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const open = () => render(<MemoryRouter><SchedulePage /></MemoryRouter>);
  it("pliega todos los días al entrar o volver a la semana resumida en móvil", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    localStorage.setItem("academic.schedule.view.7", "summary");
    const page = open();
    const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const expectCollapsed = () => weekdays.forEach(name => {
      const toggle = screen.getByRole("button", { name, exact: true });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveAttribute("inert");
    });
    expectCollapsed();
    fireEvent.click(screen.getByRole("button", { name: "Lunes", exact: true }));
    expect(screen.getByRole("button", { name: "Lunes", exact: true })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Por día", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Semanal resumida", exact: true }));
    expectCollapsed();
    page.unmount();
    open();
    expectCollapsed();
  });
  it("conserva los días abiertos al entrar en la semana resumida en escritorio", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    localStorage.setItem("academic.schedule.view.7", "summary");
    open();
    for (const name of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]) {
      expect(screen.getByRole("button", { name, exact: true })).toHaveAttribute("aria-expanded", "true");
    }
  });
  it.each([
    [26, "Lunes"], [27, "Martes"], [28, "Miércoles"], [29, "Jueves"], [30, "Viernes"],
    [31, "Lunes"], [32, "Lunes"],
  ])("selecciona %s de octubre según el día local y usa %s como jornada inicial", (date, expected) => {
    vi.setSystemTime(new Date(2026, 9, date, 12));
    open();
    expect(screen.getByRole("button", { name: expected, exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: expected, exact: true })).toBeInTheDocument();
  });
  it("permite cambiar el día y vuelve a hoy cuando se entra nuevamente", () => {
    vi.setSystemTime(new Date(2026, 9, 28, 12));
    const page = open();
    fireEvent.click(screen.getByRole("button", { name: "Viernes", exact: true }));
    page.rerender(<MemoryRouter><SchedulePage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Viernes", exact: true })).toHaveAttribute("aria-pressed", "true");
    page.unmount();
    open();
    expect(screen.getByRole("button", { name: "Miércoles", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
  it.each(["summary", "day", "table"])("muestra skeletons de datos en la vista %s y conserva los controles", view => {
    state.loading = true; state.ready = false;
    localStorage.setItem("academic.schedule.view.7", view);
    const page = open();
    const loading = screen.getByRole("status", { name: "Cargando horario" });
    expect(document.querySelector(".schedule-published")).not.toHaveAttribute("inert");
    expect(page.container.querySelector(".react-loading-skeleton")).toBeInTheDocument();
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Tabla semanal", exact: true })).toBeEnabled();
    state.loading = false; state.ready = true;
    page.rerender(<MemoryRouter><SchedulePage /></MemoryRouter>);
    expect(screen.queryByRole("status", { name: "Cargando horario" })).not.toBeInTheDocument();
  });
  it("muestra la jornada por defecto, salida explícita, bloques y no edición para USER", () => {
    open();
    expect(screen.getByRole("button", { name: "Por d\u00eda", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("16:00")).toBeInTheDocument();
    expect(screen.getByText("Lenguaje")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gestionar horario" })).not.toBeInTheDocument();
  });
  it("las tres vistas conservan los datos y recuerda la preferencia por usuario", () => {
    const page = open();
    fireEvent.click(screen.getByRole("button", { name: "Por día", exact: true }));
    expect(screen.getByText("Lenguaje")).toBeInTheDocument();
    expect(screen.getByText("16:00")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Día" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Martes", exact: true }));
    expect(screen.getByRole("button", { name: "Martes", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Lenguaje")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Martes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tabla semanal", exact: true }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Salida 16:00")).toBeInTheDocument();
    expect(screen.getAllByText("Lenguaje").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Libre")).toHaveLength(2);
    expect(localStorage.getItem("academic.schedule.view.7")).toBe("table");
    page.unmount(); open(); expect(screen.getByRole("button", { name: "Tabla semanal", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
  it("alinea los cinco dias sin una columna adicional de horas", () => {
    localStorage.setItem("academic.schedule.view.7", "table");
    open();
    const table = screen.getByRole("table");
    expect(table.querySelectorAll("thead th")).toHaveLength(5);
    expect(table.querySelectorAll("tbody th")).toHaveLength(0);
    const occupiedUntil = Array(5).fill(0);
    Array.from(table.querySelectorAll("tbody tr")).forEach((row, rowIndex) => {
      let column = 0;
      Array.from(row.querySelectorAll("td")).forEach(cell => {
        while (occupiedUntil[column] > rowIndex) column++;
        expect(column).toBeLessThan(5);
        occupiedUntil[column] = rowIndex + cell.rowSpan;
        column++;
      });
      expect(occupiedUntil.every(end => end > rowIndex)).toBe(true);
    });
  });
  it("une materias consecutivas en una celda completa sin atravesar el recreo ni modificar el horario", () => {
    const originalDays = state.schedule.days;
    const subject = { ...originalDays[0].blocks[0], name: "Matemática" };
    const blocks = [
      { ...subject, startTime: "12:00:00", endTime: "12:45:00", order: 0 },
      { ...subject, startTime: "12:45:00", endTime: "13:30:00", order: 1 },
      { ...originalDays[0].blocks[1], startTime: "13:30:00", endTime: "13:45:00", order: 2 },
      { ...subject, startTime: "13:45:00", endTime: "14:30:00", order: 3 },
    ];
    state.schedule.days = [{ ...originalDays[0], blocks }];
    localStorage.setItem("academic.schedule.view.7", "table");
    try {
      open();
      const subjects = screen.getAllByText("Matemática");
      expect(subjects).toHaveLength(2);
      const mergedCell = subjects[0].closest("td");
      expect(mergedCell).toHaveAttribute("rowspan", "2");
      expect(mergedCell).toHaveTextContent("12:00 – 13:30");
      expect(mergedCell).toHaveTextContent("90 min");
      expect(subjects[1].closest("td")).toHaveAttribute("rowspan", "1");
      expect(blocks[0].endTime).toBe("12:45:00");
      expect(state.schedule.days[0].blocks).toHaveLength(4);
    } finally { state.schedule.days = originalDays; }
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
      fireEvent.click(screen.getByRole("button", { name: "Por día", exact: true }));
      expect(screen.getAllByText(label)).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Tabla semanal", exact: true }));
      expect(screen.getAllByText(label)).toHaveLength(1);
    } finally { Object.assign(block, previous); }
  });
  it("no transfiere la preferencia al cambiar de usuario en la misma pantalla", () => {
    const page = open();
    fireEvent.click(screen.getByRole("button", { name: "Tabla semanal", exact: true }));
    account.user.id = 8;
    page.rerender(<MemoryRouter><SchedulePage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Por d\u00eda", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("academic.schedule.view.7")).toBe("table");
    expect(localStorage.getItem("academic.schedule.view.8")).toBe("day");
  });
});
