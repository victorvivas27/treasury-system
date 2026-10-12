import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleManagementPage } from "./ScheduleManagementPage";
import type { Schedule } from "@/core/A-domain/entities/academic/Schedule";
const data = vi.hoisted(() => ({
  schedule: { days: [] } as Schedule, editable: true, periods: [{ schoolYear: 2026, course: "Curso", editable: true }],
  year: 2026, setYear: vi.fn(), loading: false, saving: false, pendingAction: null as "save" | "publish" | "delete" | null, error: "", message: "", retry: vi.fn(),
  save: vi.fn().mockResolvedValue(true), remove: vi.fn(),
}));
vi.mock("@/presentation/hooks/academic/useSchedule", () => ({ useSchedule: () => data }));
const schedule = (): Schedule => ({ days: [
  { dayOfWeek: 1, entryTime: "12:00", exitTime: "16:00", blocks: [
    { dayOfWeek: 1, startTime: "12:00", endTime: "12:45", type: "SUBJECT", name: "Lenguaje", order: 0, color: null },
  ] },
  { dayOfWeek: 2, entryTime: "12:00", exitTime: "14:30", blocks: [] },
] });
describe("Editor del horario", () => {
  beforeEach(() => { vi.clearAllMocks(); data.save.mockResolvedValue(true); data.schedule = schedule(); data.editable = true; data.error = ""; data.saving = false; data.pendingAction = null; data.message = ""; });
  const open = () => {
    const page = render(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    screen.getAllByRole("button", { name: /^Desplegar / }).forEach(button => fireEvent.click(button));
    return page;
  };
  it.each(["SUBJECT", "ACTIVITY", "BREAK", "LUNCH", "SNACK"] as const)("usa el desplegable de diez colores también para %s", (type) => {
    data.schedule.days[0].blocks[0].type = type;
    const page = open();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    const select = screen.getByRole("combobox", { name: "Color Lunes bloque 1" });
    expect(within(select).getAllByRole("option").filter(option => !(option as HTMLOptionElement).disabled)).toHaveLength(10);
    expect(page.container.querySelector('input[type="color"]')).toBeNull();
    fireEvent.change(select, { target: { value: "#16a34a" } });
    expect(select).toHaveValue("#16a34a");
  });
  it("ofrece diez colores fijos para materias y persiste la selección", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    const palette = screen.getByRole("combobox", { name: "Color Lunes bloque 1" });
    expect(within(palette).getAllByRole("option").filter(option => !(option as HTMLOptionElement).disabled)).toHaveLength(10);
    expect(screen.getByLabelText("Nombre Lunes bloque 1").closest(".schedule-editor-block")?.querySelector('input[type="color"]')).toBeNull();
    fireEvent.change(palette, { target: { value: "#2563eb" } });
    expect(palette).toHaveValue("#2563eb");
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalledWith(expect.objectContaining({
      days: expect.arrayContaining([expect.objectContaining({ blocks: [expect.objectContaining({ color: "#2563eb" })] })]),
    }), false));
  });
  it("guarda horarios diarios independientes y valida antes de persistir", async () => {
    open();
    expect(screen.getByLabelText("Salida · Martes · Hora")).toHaveValue("14");
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Hora"), { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    expect(screen.getByRole("alert")).toHaveTextContent("fuera de la jornada");
    expect(data.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Hora"), { target: { value: "13" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalledWith(expect.objectContaining({ days: expect.any(Array) }), false));
  });
  it("actualiza el contador al editar horas y marca el día completo solo al cubrir la jornada", () => {
    data.schedule = { days: [{ dayOfWeek: 1, entryTime: "07:00", exitTime: "15:30", blocks: [
      { dayOfWeek: 1, startTime: "07:00", endTime: "08:30", type: "SUBJECT", name: "Lenguaje", order: 0, color: null },
    ] }] };
    open();
    const counter = screen.getByRole("status", { name: "Tiempo de la jornada · Lunes" });
    expect(counter).toHaveTextContent("Jornada 8 h 30 min");
    expect(counter).toHaveTextContent("Cubierto 1 h 30 min");
    expect(counter).toHaveTextContent("Faltan 7 h");
    expect(within(counter).getByRole("progressbar")).toHaveAttribute("value", "90");
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Hora"), { target: { value: "15" } });
    expect(counter).toHaveTextContent("Día completo");
    fireEvent.change(screen.getByLabelText("Nombre Lunes bloque 1"), { target: { value: "" } });
    expect(counter).toHaveTextContent("Revisa los bloques");
    expect(counter).not.toHaveTextContent("Día completo");
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Hora"), { target: { value: "14" } });
    expect(counter).toHaveTextContent("Faltan 1 h");
  });
  it("guarda Matemática de dos horas sin bloquearse por otro día incompleto, pero valida toda la semana al publicar", async () => {
    data.schedule.days[0].blocks[0].name = "Matemática";
    open();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Hora"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Fin Lunes bloque 1 · Minutos"), { target: { value: "00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalledWith(expect.objectContaining({
      days: expect.arrayContaining([expect.objectContaining({ blocks: [expect.objectContaining({ name: "Matemática", startTime: "12:00", endTime: "14:00" })] })]),
    }), false));
    data.save.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: "Añadir bloque" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalled());
    expect(data.save.mock.calls[0][0].days.find((day: { dayOfWeek: number }) => day.dayOfWeek === 2).blocks).toEqual([]);
    expect(screen.getByText("Lunes guardado como borrador.")).toBeInTheDocument();
    data.save.mockClear();
    expect(screen.queryByRole("button", { name: "Guardar borrador" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publicar horario" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(data.save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Martes · Materia (bloque 1): falta configurar");
    expect(screen.getByRole("alert")).toHaveFocus();
  });
  it("conserva los cambios pendientes de otros días cuando llega la jornada guardada del servidor", async () => {
    const page = open();
    fireEvent.click(screen.getAllByRole("button", { name: "Añadir bloque" })[1]);
    fireEvent.change(screen.getByLabelText("Nombre Martes bloque 1"), { target: { value: "Pendiente de completar" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalled());
    data.schedule = data.save.mock.calls[0][0];
    page.rerender(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Editar Martes bloque 1" }));
    expect(screen.getByLabelText("Nombre Martes bloque 1")).toHaveValue("Pendiente de completar");
  });
  it("muestra junto a Guardar si el servidor rechaza la operación", async () => {
    data.save.mockResolvedValue(false);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar"));
    expect(screen.getByRole("alert").closest(".schedule-day")).toHaveTextContent("Lunes");
    expect(screen.getByRole("button", { name: "Editar Lunes bloque 1" })).toBeInTheDocument();
  });
  it("explica los días que faltan junto a Publicar incluso con las tarjetas plegadas", () => {
    render(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Publicar horario" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(data.save).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Faltan: Miércoles, Jueves, Viernes");
    expect(alert.closest(".schedule-day")).toBeNull();
    expect(alert).toHaveFocus();
  });
  it("solo Guardar muestra loader mientras persiste una jornada", async () => {
    let finish!: (value: boolean) => void;
    data.save.mockImplementation(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const page = open();
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    data.saving = true; data.pendingAction = "save";
    page.rerender(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Guardar jornada · Lunes" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Publicar horario" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" })).toBeDisabled();
    await act(async () => finish(true));
  });
  it("publica cinco jornadas y muestra el rechazo del servidor junto al botón", async () => {
    data.schedule = { days: Array.from({ length: 5 }, (_, index) => ({
      dayOfWeek: index + 1, entryTime: "08:00", exitTime: "14:00", blocks: [],
    })) };
    data.save.mockResolvedValue(false);
    const page = render(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Publicar horario" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(data.save).toHaveBeenCalledWith(data.schedule, true));
    data.error = "Los años históricos son de solo lectura.";
    page.rerender(<MemoryRouter><ScheduleManagementPage /></MemoryRouter>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(data.error);
    expect(alert.closest(".schedule-day")).toBeNull();
    expect(alert).toHaveFocus();
  });
  it("solo Eliminar muestra loader al borrar todo el horario", () => {
    data.saving = true; data.pendingAction = "delete";
    open();
    expect(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Publicar horario" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Guardar jornada · Lunes" })).toHaveAttribute("aria-busy", "false");
  });
  it("confirma copiar sobre contenido y bloquea fondo con foco y Escape", () => {
    open();
    fireEvent.change(screen.getByLabelText("Copiar Lunes a"), { target: { value: "2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Copiar jornada" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Salida · Martes · Hora")).toHaveValue("14");
    fireEvent.click(screen.getAllByRole("button", { name: "Copiar jornada" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByLabelText("Salida · Martes · Hora")).toHaveValue("16");
    fireEvent.click(screen.getByRole("button", { name: "Editar Martes bloque 1" }));
    expect(screen.getByLabelText("Nombre Martes bloque 1")).toHaveValue("Lenguaje");
  });
  it("solicita confirmación antes de eliminar y descartar al cambiar de año", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar bloque" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByLabelText("Nombre Lunes bloque 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre Lunes bloque 1"), { target: { value: "Otra" } });
    fireEvent.change(screen.getByLabelText("Año escolar"), { target: { value: "2026" } });
    expect(data.setYear).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("sin guardar");
  });
  it("bloquea edición de años históricos", () => {
    data.editable = false; open();
    expect(screen.getByText(/histórico es de solo lectura/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar horario" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" })).toBeDisabled();
    expect(screen.getByLabelText("Salida · Lunes · Hora")).toBeDisabled();
  });
  it.each(["BREAK", "LUNCH", "SNACK"])("el tipo %s no requiere nombre manual y limpia el nombre anterior", async (type) => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    fireEvent.change(screen.getByLabelText("Tipo · Lunes bloque 1"), { target: { value: type } });
    expect(screen.queryByLabelText("Nombre Lunes bloque 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(data.save).toHaveBeenCalledWith(expect.objectContaining({
      days: expect.arrayContaining([expect.objectContaining({ blocks: [expect.objectContaining({ type, name: null })] })]),
    }), false));
  });
  it("exige dos confirmaciones y escribir el año antes de eliminar todo el horario", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("TODO el horario del año 2026");
    expect(screen.getByRole("dialog")).toHaveTextContent("no se puede deshacer");
    expect(data.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const input = screen.getByLabelText("Escribe ELIMINAR 2026");
    expect(input).toHaveFocus();
    const finalButton = screen.getByRole("button", { name: "Eliminar definitivamente" });
    expect(finalButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    fireEvent.change(input, { target: { value: "ELIMINAR 2025" } });
    fireEvent.click(finalButton);
    expect(data.remove).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "ELIMINAR 2026" } });
    expect(finalButton).toBeEnabled();
    fireEvent.click(finalButton);
    expect(data.remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("permite cancelar la segunda confirmación sin borrar y reinicia el texto al reabrir", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Escribe ELIMINAR 2026"), { target: { value: "ELIMINAR 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(data.remove).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar todo el horario de 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Escribe ELIMINAR 2026")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(data.remove).not.toHaveBeenCalled();
  });
  it("muestra resúmenes, abre un solo bloque y los pliega después de guardar", async () => {
    data.schedule.days[0].blocks.push({ dayOfWeek: 1, startTime: "13:00", endTime: "13:45",
      type: "SUBJECT", name: "Matemática", order: 1, color: null });
    open();
    expect(screen.getByText("Lenguaje")).toBeInTheDocument();
    expect(screen.getByText("12:00 – 12:45")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre Lunes bloque 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 1" }));
    expect(screen.getByLabelText("Nombre Lunes bloque 1")).toHaveValue("Lenguaje");
    fireEvent.click(screen.getByRole("button", { name: "Editar Lunes bloque 2" }));
    expect(screen.queryByLabelText("Nombre Lunes bloque 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre Lunes bloque 2")).toHaveValue("Matemática");
    fireEvent.click(screen.getByRole("button", { name: "Guardar jornada · Lunes" }));
    await waitFor(() => expect(screen.queryByLabelText("Nombre Lunes bloque 2")).not.toBeInTheDocument());
    expect(data.save).toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Añadir bloque" })[0]);
    expect(screen.getByLabelText("Nombre Lunes bloque 3")).toHaveValue("");
    expect(screen.queryByLabelText("Nombre Lunes bloque 2")).not.toBeInTheDocument();
    const summaries = screen.getAllByRole("button", { name: /Editar Lunes bloque/ });
    expect(summaries.map(button => button.getAttribute("aria-label"))).toEqual([
      "Editar Lunes bloque 1", "Editar Lunes bloque 2", "Editar Lunes bloque 3",
    ]);
  });
});
