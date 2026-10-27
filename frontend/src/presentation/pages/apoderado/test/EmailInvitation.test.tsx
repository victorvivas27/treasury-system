import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ApoderadoPage } from "../ApoderadoPage";
const enableAccess = vi.hoisted(() => vi.fn());
const guardian = vi.hoisted(() => ({ codigo: "AP-12345678", nombre: "Ana", email: "ana@example.com", telefono: "+56912345678", activo: true }));
vi.mock("@/presentation/hooks/apoderado/useApoderados", () => ({ useApoderados: () => ({ apoderados: [guardian], loading: false, refetch: vi.fn() }) }));
vi.mock("@/presentation/hooks/apoderado/useDeleteApoderado", () => ({ useDeleteApoderado: () => ({ alert: { isOpen: false }, closeAlert: vi.fn() }) }));
vi.mock("@/presentation/context/AuthContext", () => ({ useOptionalAuth: () => null }));
vi.mock("@/presentation/features/apoderado/ApoderadosList", () => ({ ApoderadosList: ({ handleEnableAccess }: { handleEnableAccess: (value: typeof guardian) => void }) => <button onClick={() => handleEnableAccess(guardian)}>Invitar Ana</button> }));
vi.mock("@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({ ApoderadoRepositoryImpl: class {
 enableAccess = enableAccess;
} }));
describe("Invitacion por correo", () => {
 beforeEach(() => { vi.clearAllMocks(); enableAccess.mockResolvedValue(guardian); });
 it("envia la invitacion por correo", async () => {
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Enviar invitaci/ }));
  await waitFor(() => expect(enableAccess).toHaveBeenCalledWith("AP-12345678", undefined));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Enviar invitaci/ })).not.toBeInTheDocument());
 });
 it("permite reintentar si falla el correo", async () => {
  enableAccess.mockRejectedValue(new Error("Correo no disponible"));
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  fireEvent.click(screen.getByRole("button", { name: /Enviar invitaci/ }));
  expect(await screen.findByText(/No fue posible habilitar el acceso/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: /Enviar invitaci/ })).toBeEnabled());
 });
});
