import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ApoderadoPage } from "../ApoderadoPage";
const invite = vi.hoisted(() => vi.fn());
const status = vi.hoisted(() => vi.fn());
const channels = vi.hoisted(() => vi.fn());
const enableAccess = vi.hoisted(() => vi.fn());
const guardian = vi.hoisted(() => ({ codigo: "AP-12345678", nombre: "Ana", email: "ana@example.com", telefono: "+56912345678", activo: true }));
vi.mock("@/presentation/hooks/apoderado/useApoderados", () => ({ useApoderados: () => ({ apoderados: [guardian], loading: false, refetch: vi.fn() }) }));
vi.mock("@/presentation/hooks/apoderado/useDeleteApoderado", () => ({ useDeleteApoderado: () => ({ alert: { isOpen: false }, closeAlert: vi.fn() }) }));
vi.mock("@/presentation/context/AuthContext", () => ({ useOptionalAuth: () => null }));
vi.mock("@/presentation/features/apoderado/ApoderadosList", () => ({ ApoderadosList: ({ handleEnableAccess }: { handleEnableAccess: (value: typeof guardian) => void }) => <button onClick={() => handleEnableAccess(guardian)}>Invitar Ana</button> }));
vi.mock("@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl", () => ({ ApoderadoRepositoryImpl: class {
 invitationChannels = channels; invitationStatus = status; inviteWhatsApp = invite; enableAccess = enableAccess;
} }));
describe("Invitacion WhatsApp", () => {
 beforeEach(() => {
  vi.clearAllMocks();
  channels.mockResolvedValue({ whatsappEnabled: true });
  enableAccess.mockResolvedValue(guardian);
  status.mockResolvedValue({ status: "NONE" });
  invite.mockResolvedValue({ status: "PENDING", deliveryStatus: "ACCEPTED", simulated: false });
 });
 it("exige consentimiento con fuente y fecha y distingue aceptado de entregado", async () => {
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  await screen.findByRole("option", { name: "WhatsApp" });
  fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "whatsapp" } });
  expect(screen.getByRole("button", { name: /Enviar invitaci/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText(/Fuente de autorizaci/), { target: { value: "Formulario firmado" } });
  fireEvent.change(screen.getByLabelText(/Fecha de autorizaci/), { target: { value: "2026-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: /Enviar invitaci/ }));
  await waitFor(() => expect(invite).toHaveBeenCalledWith("AP-12345678", { authorized: true, source: "Formulario firmado", authorizedAt: "2026-01-01T00:00:00" }));
  expect(await screen.findByText(/Meta acept/)).toHaveTextContent(/pendiente de confirmaci/);
  expect(screen.queryByRole("button", { name: /Enviar invitaci/ })).not.toBeInTheDocument();
 });
 it("muestra un fallo de entrega persistido", async () => {
  status.mockResolvedValue({ status: "PENDING", deliveryStatus: "FAILED", errorCode: "META_DELIVERY_FAILED" });
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  await screen.findByRole("option", { name: "WhatsApp" });
  fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "whatsapp" } });
  expect(await screen.findByText(/No se pudo enviar o entregar/)).toBeInTheDocument();
  expect(invite).not.toHaveBeenCalled();
 });
 it.each([true, false])("envia por ambos medios e informa el resultado del correo: %s", async (emailSent) => {
  invite.mockResolvedValue({ status: "PENDING", deliveryStatus: "ACCEPTED", simulated: false, emailSent });
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  await screen.findByRole("option", { name: "WhatsApp y correo" });
  fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "both" } });
  expect(screen.getByRole("button", { name: /Enviar invitaci/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText(/Fuente de autorizaci/), { target: { value: "Formulario firmado" } });
  fireEvent.change(screen.getByLabelText(/Fecha de autorizaci/), { target: { value: "2026-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: /Enviar invitaci/ }));
  await waitFor(() => expect(invite).toHaveBeenCalledWith("AP-12345678", {
   authorized: true, source: "Formulario firmado", authorizedAt: "2026-01-01T00:00:00", sendEmail: true,
  }));
  expect(await screen.findByText(emailSent ? /Correo enviado/ : /No fue posible enviar el correo/)).toBeInTheDocument();
  if (emailSent) expect(screen.queryByRole("button", { name: /Enviar invitaci/ })).not.toBeInTheDocument();
  else expect(screen.getByRole("button", { name: /Enviar invitaci/ })).toBeInTheDocument();
 });
 it.each(["disabled", "unavailable"])("conserva el envio por correo con WhatsApp %s", async (availability) => {
  if (availability === "disabled") channels.mockResolvedValue({ whatsappEnabled: false });
  else channels.mockRejectedValue(new Error("Service unavailable"));
  render(<MemoryRouter><ApoderadoPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Invitar Ana"));
  await waitFor(() => expect(channels).toHaveBeenCalled());
  expect(screen.queryByRole("option", { name: "WhatsApp" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "WhatsApp y correo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Enviar invitaci/ }));
  await waitFor(() => expect(enableAccess).toHaveBeenCalledWith("AP-12345678", undefined));
  expect(screen.queryByRole("button", { name: /Enviar invitaci/ })).not.toBeInTheDocument();
  expect(status).not.toHaveBeenCalled();
  expect(invite).not.toHaveBeenCalled();
 });
});
