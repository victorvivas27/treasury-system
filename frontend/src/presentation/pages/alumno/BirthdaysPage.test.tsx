import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { BirthdaysPage } from "./BirthdaysPage";
import { birthdayResource, clearDashboardCache } from "@/presentation/pages/dashboard/dashboardCache";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";

const { getBirthdays } = vi.hoisted(() => ({ getBirthdays: vi.fn() }));
vi.mock("@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl", () => ({
  AlumnoRepositoryImpl: class { getBirthdays = getBirthdays; },
}));
const alumno = { alumnoId: 1, codigo: "AL-1", nombre: "Martina Rojas", curso: "1A",
  fechaNacimiento: "2015-12-20", genero: "FEMENINO", activo: true };

beforeEach(() => {
  clearDashboardCache();
  vi.resetAllMocks();
  getBirthdays.mockResolvedValue([alumno]);
});

it("muestra el loader compartido en la primera carga sin tarjetas ficticias", async () => {
  const { container } = render(<BirthdaysPage />);
  expect(screen.getByLabelText("Preparando los cumpleaños")).toBeInTheDocument();
  expect(container.querySelector("main")).toHaveAttribute("inert");
  expect(container.querySelectorAll(".birthday-card--loading, .skeleton-block, .birthday-section__empty"))
    .toHaveLength(0);
  await screen.findByText("Martina Rojas", { exact: true });
  expect(screen.queryByLabelText("Preparando los cumpleaños")).not.toBeInTheDocument();
});

it("conserva los cumpleaños al salir y volver sin otra consulta ni loader", async () => {
  const first = render(<BirthdaysPage />);
  await screen.findByText("Martina Rojas", { exact: true });
  first.unmount();
  render(<BirthdaysPage />);
  expect(screen.getByText("Martina Rojas", { exact: true })).toBeInTheDocument();
  expect(screen.queryByLabelText("Preparando los cumpleaños")).not.toBeInTheDocument();
  expect(getBirthdays).toHaveBeenCalledTimes(1);
});

it("reutiliza los cumpleaños ya preparados por el dashboard", async () => {
  await birthdayResource.load();
  render(<BirthdaysPage />);
  expect(screen.getByText("Martina Rojas", { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(getBirthdays).toHaveBeenCalledTimes(1);
});

it("permite reintentar una primera carga fallida", async () => {
  getBirthdays.mockRejectedValueOnce(new Error("Offline"));
  render(<BirthdaysPage />);
  await screen.findByRole("alert");
  expect(screen.queryByLabelText("Preparando los cumpleaños")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByText("Martina Rojas", { exact: true });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("mantiene los datos visibles si falla una actualización en segundo plano", async () => {
  render(<BirthdaysPage />);
  await screen.findByText("Martina Rojas", { exact: true });
  getBirthdays.mockRejectedValueOnce(new Error("Offline"));
  await act(async () => { await birthdayResource.load(true); });
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByText("Martina Rojas", { exact: true })).toBeInTheDocument();
  expect(screen.queryByLabelText("Preparando los cumpleaños")).not.toBeInTheDocument();
});

it("muestra el estado vacío cuando la consulta termina sin cumpleaños", async () => {
  getBirthdays.mockResolvedValue([]);
  render(<BirthdaysPage />);
  await screen.findByText(/Agrega la fecha de nacimiento/);
  expect(screen.queryByLabelText("Preparando los cumpleaños")).not.toBeInTheDocument();
});

it("descarta los datos de la sesión anterior", async () => {
  const first = render(<BirthdaysPage />);
  await screen.findByText("Martina Rojas", { exact: true });
  first.unmount();
  resetDashboard();
  getBirthdays.mockResolvedValue([{ ...alumno, nombre: "Ana Pérez" }]);
  render(<BirthdaysPage />);
  expect(screen.queryByText("Martina Rojas", { exact: true })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("Ana Pérez", { exact: true })).toBeInTheDocument());
  expect(getBirthdays).toHaveBeenCalledTimes(2);
});
