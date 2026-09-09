import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { useAuth } from "@/presentation/context/AuthContext";
import { PaymentsPage } from "./PaymentsPage";
import { mercadoPagoRepository } from "@/core/C-infra/repositories/treasury/MercadoPagoRepository";

vi.mock("@/core/C-infra/repositories/treasury/MercadoPagoRepository", () => ({
  mercadoPagoRepository: { available: vi.fn(), checkout: vi.fn(), reconcile: vi.fn() },
}));

vi.mock("@/core/D-config/api", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => { resolve = next; });
  return { promise, resolve };
};

describe("PaymentsPage para apoderado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mercadoPagoRepository.available).mockResolvedValue(true);
    vi.mocked(useAuth).mockReturnValue({
      user: { rol: "USER" },
    } as ReturnType<typeof useAuth>);
  });

  it.each(["ANUAL", "DOS_CUOTAS"] as const)("guarda la elección %s y oculta las alternativas", async mode => {
    const initial = { schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "AMBAS", studentName: "Alumno",
      selectedMode: null, paidAmount: 0, bankAccount: null, installments: [] };
    const selected = { ...initial, selectedMode: mode, installments: mode === "ANUAL"
      ? [{ id: 1, concept: "Cuota anual", amount: 70000, dueDate: "2026-09-30", status: "PENDIENTE", history: [] }]
      : [1, 2].map(id => ({ id, concept: `Cuota ${id}`, amount: 35000, dueDate: "2026-09-30", status: "PENDIENTE", history: [] })) };
    vi.mocked(apiClient.get).mockResolvedValue({ data: initial });
    vi.mocked(apiClient.post).mockResolvedValue({ data: selected });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: mode === "ANUAL" ? /Pago único/ : /Dos cuotas/ }));
    await waitFor(() => expect(screen.queryByText("¿Cómo quieres pagar?")).not.toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining("/mi-plan"), { year: new Date().getFullYear(), mode });
    expect(screen.getAllByRole("button", { name: "Pagar con Mercado Pago" })).toHaveLength(mode === "ANUAL" ? 1 : 2);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar modalidad" }));
    expect(screen.getByText("¿Cómo quieres pagar?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a mi plan" }));
    expect(screen.queryByText("¿Cómo quieres pagar?")).not.toBeInTheDocument();
  });

  it("tras pagar la primera cuota conserva solo el pago pendiente y bloquea cambiar de plan", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "AMBAS", studentName: "Alumno",
      selectedMode: "DOS_CUOTAS", paidAmount: 35000, bankAccount: null,
      installments: [
        { id: 1, concept: "Primera cuota", amount: 35000, dueDate: "2026-04-30", status: "PAGADA", history: [] },
        { id: 2, concept: "Segunda cuota", amount: 35000, dueDate: "2026-09-30", status: "PENDIENTE", history: [] },
      ],
    } });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    const button = await screen.findByRole("button", { name: "Pagar con Mercado Pago" });
    expect(within(button.closest("article")!).getByText("Segunda cuota")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar modalidad" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cuota anual 2026" })).toHaveTextContent("$70.000");
    expect(screen.queryByText(/Saldo pendiente|Saldo disponible/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Métodos de pago" })).toBeInTheDocument();
  });

  it("permite adjuntar comprobante a una cuota pagada por Mercado Pago", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 10, allowedMode: "AMBAS", studentName: "Alumno",
      selectedMode: "PERSONALIZADA", paidAmount: 10, bankAccount: null,
      installments: [{ id: 1, concept: "Cuota personalizada", amount: 10, dueDate: "2026-12-31", status: "PAGADA",
        history: [{ id: 8, paymentMethod: "MERCADO_PAGO", status: "PAID", paidAt: "2026-09-08T19:55:46Z",
          providerPaymentId: "177965423432", originalFileName: null }] }],
    } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);

    const input = await screen.findByLabelText("Subir comprobante");
    const file = new File(["%PDF-prueba"], "comprobante.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/mis-cuotas/1/comprobante"),
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    ));
  });

  it.each([undefined, null, Number.NaN])("recupera la cuota anual cuando el monto recibido es %s", async annualAmount => {
    const payments = { schoolYear: 2026, annualAmount, totalAmount: 25000, allowedMode: "AMBAS",
      studentName: "Alumno", selectedMode: "PERSONALIZADA", paidAmount: 0, bankAccount: null, installments: [] };
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: String(url).endsWith("/configuraciones/2026")
      ? { year: 2026, annualAmount: 70000 } : payments }));
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    const annualFee = await screen.findByRole("region", { name: "Cuota anual 2026" });
    expect(annualFee).toHaveTextContent("$70.000");
    expect(apiClient.get).toHaveBeenCalledWith("/tesoreria/configuraciones/2026");
    expect(within(annualFee).getByText("Cuota anual 2026").parentElement).toHaveTextContent("$70.000");
    expect(screen.queryByText(/NaN|Saldo pendiente|Saldo disponible/)).not.toBeInTheDocument();
  });

  it.each([
    ["PERSONALIZADA", "PENDING"], ["ANUAL", "PENDING"], ["ANUAL", "REJECTED"],
    ["ANUAL", "FAILED"], ["ANUAL", "CANCELLED"],
  ])("protege la personalizada y conserva el plan con historial (%s, %s)", async (mode, status) => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 25000, allowedMode: "AMBAS", studentName: "Alumno",
      selectedMode: mode, paidAmount: 0, bankAccount: null,
      installments: [{ id: 1, concept: "Cuota asignada", amount: 25000, dueDate: "2026-09-30", status: "PENDIENTE",
        history: mode === "ANUAL" ? [{ id: 8, paymentMethod: "MERCADO_PAGO", status }] : [] }],
    } });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    await screen.findByText("Cuota asignada");
    expect(screen.queryByRole("button", { name: "Cambiar modalidad" })).not.toBeInTheDocument();
    expect(screen.queryByText("¿Cómo quieres pagar?")).not.toBeInTheDocument();
    if (mode === "PERSONALIZADA") {
      expect(screen.getByRole("region", { name: "Cuota anual 2026" })).toHaveTextContent("$70.000");
      expect(screen.getAllByText("Cuota personalizada").length).toBeGreaterThan(0);
      expect(screen.getByText(/Total de tu plan/)).toBeInTheDocument();
    }
  });

  it("integra el botón anual y el historial en la página existente", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "ANUAL", studentName: "Alumno",
      selectedMode: "ANUAL", paidAmount: 0, bankAccount: null,
      installments: [{ id: 3, installment: "ANUAL", concept: "Cuota anual", amount: 70000,
        dueDate: "2026-09-30", status: "PENDIENTE", history: [{ id: 8, paymentMethod: "MERCADO_PAGO",
          status: "PENDING", providerPaymentId: "42", providerStatus: "rejected" }] }],
    } });
    vi.mocked(mercadoPagoRepository.checkout).mockRejectedValue(new Error("unavailable"));
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    const button = await screen.findByRole("button", { name: "Pagar con Mercado Pago" });
    expect(screen.queryByText("Historial del pago")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Detalle/ }));
    expect(screen.getByText("Historial del pago")).toBeInTheDocument();
    expect(screen.queryByText("Ver comprobante")).not.toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(mercadoPagoRepository.checkout).toHaveBeenCalledWith(3));
    expect(await screen.findByText(/No pudimos abrir Mercado Pago/)).toBeInTheDocument();
  });

  it("mantiene el skeleton hasta tener juntos la cuenta y las cuotas", async () => {
    const bank = deferred<{ data: Record<string, unknown> }>();
    const payments = deferred<{ data: Record<string, unknown> }>();
    vi.mocked(apiClient.get).mockImplementation(url =>
      String(url).endsWith("/cuenta-bancaria") ? bank.promise : payments.promise);

    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Cargando tus pagos" })).toBeInTheDocument();

    await act(async () => bank.resolve({ data: {
      id: 3, schoolYear: 2026, accountHolderName: "Curso", accountHolderRut: "1-9",
      bankName: "Banco", accountType: "Vista", accountNumber: "123", email: "curso@mail.cl",
    } }));

    expect(screen.getByRole("status", { name: "Cargando tus pagos" })).toBeInTheDocument();
    expect(screen.queryByText("Falta configurar la cuota anual")).not.toBeInTheDocument();

    await act(async () => payments.resolve({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "AMBAS", studentName: "Sofía Díaz",
      selectedMode: "DOS_CUOTAS", paidAmount: 0, bankAccount: null,
      installments: [
        { id: 1, concept: "Primera cuota", amount: 35000, dueDate: "2026-04-15",
          status: "PENDIENTE", history: [] },
        { id: 2, concept: "Segunda cuota", amount: 35000, dueDate: "2026-07-15",
          status: "PENDIENTE", history: [] },
      ],
    } }));

    expect(await screen.findByRole("heading", { name: "Sofía Díaz" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando tus pagos" })).not.toBeInTheDocument();
    expect(screen.getAllByText("$35.000")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Métodos de pago" })).toBeInTheDocument();
    const checkoutButtons = screen.getAllByRole("button", { name: "Pagar con Mercado Pago" });
    expect(checkoutButtons).toHaveLength(2);
    vi.mocked(mercadoPagoRepository.checkout).mockRejectedValue(new Error("unavailable"));
    fireEvent.click(checkoutButtons[0]);
    await waitFor(() => expect(mercadoPagoRepository.checkout).toHaveBeenCalledWith(1));
    await waitFor(() => expect(checkoutButtons[1]).toBeEnabled());
    fireEvent.click(checkoutButtons[1]);
    await waitFor(() => expect(mercadoPagoRepository.checkout).toHaveBeenCalledWith(2));
    await screen.findByText(/No pudimos abrir Mercado Pago/);
  });

  it("muestra Mercado Pago sin configuración y bloquea el cobro", async () => {
    vi.mocked(mercadoPagoRepository.available).mockResolvedValue(false);
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "ANUAL", studentName: "Alumno",
      selectedMode: "ANUAL", paidAmount: 0, bankAccount: null,
      installments: [{ id: 3, installment: "ANUAL", concept: "Cuota anual", amount: 70000,
        dueDate: "2026-09-30", status: "PENDIENTE", history: [] }],
    } });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText("Pendiente de activación")).toBeInTheDocument();
    const button = await screen.findByRole("button", { name: "Pagar con Mercado Pago" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mercadoPagoRepository.checkout).not.toHaveBeenCalled();
  });

  it("mantiene visible la tarjeta si no se pueden cargar disponibilidad ni cuotas", async () => {
    vi.mocked(mercadoPagoRepository.available).mockRejectedValue(new Error("network"));
    vi.mocked(apiClient.get).mockRejectedValue(new Error("network"));
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mercado Pago para la cuota anual" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagar con Mercado Pago" })).not.toBeInTheDocument();
  });

  it.each([
    [404, "No existe configuración de cuota para el año 2026"],
    [403, "Tu usuario no está asociado a un apoderado"],
    [404, "No existe una familia asociada"],
  ])("muestra el motivo de carga devuelto por el servidor (%s)", async (status, message) => {
    vi.mocked(apiClient.get).mockRejectedValue({ response: { status, data: { errors: { pago: message } } } });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("distingue errores de conexión de cuotas sin configurar", async () => {
    vi.mocked(apiClient.get).mockRejectedValue({ response: undefined });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText(/No pudimos conectar con el servidor para cargar tus pagos/)).toBeInTheDocument();
    expect(screen.queryByText(/No existe configuración de cuota/)).not.toBeInTheDocument();
  });

  it("no expone detalles internos de errores del servidor", async () => {
    vi.mocked(apiClient.get).mockRejectedValue({ response: { status: 500, data: { errors: { internal: "SQL detail" } } } });
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText("No fue posible cargar tus pagos. Intenta nuevamente.")).toBeInTheDocument();
    expect(screen.queryByText("SQL detail")).not.toBeInTheDocument();
  });

  it("informa al administrador de la activación pendiente", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { rol: "ADMIN" } } as ReturnType<typeof useAuth>);
    vi.mocked(mercadoPagoRepository.available).mockResolvedValue(false);
    vi.mocked(apiClient.get).mockRejectedValue(new Error("not configured"));
    render(<MemoryRouter><PaymentsPage /></MemoryRouter>);
    expect(await screen.findByText(/Falta activar la conexión con Mercado Pago/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument();
  });
});
