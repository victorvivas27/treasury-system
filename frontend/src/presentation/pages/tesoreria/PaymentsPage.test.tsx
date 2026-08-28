import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/D-config/api";
import { useAuth } from "@/presentation/context/AuthContext";
import { PaymentsPage } from "./PaymentsPage";

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
    vi.mocked(useAuth).mockReturnValue({
      user: { rol: "USER" },
    } as ReturnType<typeof useAuth>);
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
      schoolYear: 2026, totalAmount: 70000, allowedMode: "AMBAS", studentName: "Sofía Díaz",
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
  });
});
