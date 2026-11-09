import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { clearProfileCache, ProfilePage } from "./ProfilePage";

const profile = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const syncUser = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: class { profile = profile; },
}));
vi.mock("@/core/C-infra/repositories/user/UserRepositoryImpl", () => ({
  UserRepositoryImpl: class { updateSelfProfile = updateUser; },
}));

const baseProfile = {
  familyId: 8,
  familyCode: "FAM-008",
  studentName: "SOFÍA DÍAZ",
  studentMessage: "Retirar el viernes a las 13:00.",
  guardianPhone: "+56912345678",
  relationship: "Padre",
  primaryGuardian: true,
  mode: "DOS_CUOTAS",
  obligations: [
    { id: 1, amount: 35000, dueDate: "2026-04-15", status: "PENDIENTE", mode: "DOS_CUOTAS", concept: "Primera cuota" },
    { id: 2, amount: 35000, dueDate: "2026-07-15", status: "PENDIENTE", mode: "DOS_CUOTAS", concept: "Segunda cuota" },
  ],
};

describe("ProfilePage", () => {
  beforeEach(() => {
    clearProfileCache();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1, code: "USR-001", nombre: "Juan Díaz", correo: "juandiaz@mail.com",
        rol: "USER", enabled: true, accountNonLocked: true, createdAt: "", updatedAt: "",
      },
      loading: false,
      isAuthenticated: true,
      syncUser,
      logout,
    } as ReturnType<typeof useAuth>);
    profile.mockResolvedValue(baseProfile);
  });

  afterEach(() => vi.clearAllMocks());

  const renderProfile = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);

  it("filtra los pagos por año y conserva los datos familiares", async () => {
    const previousYear = new Date().getFullYear() - 1;
    profile.mockImplementation(async (year: number) => year === previousYear
      ? { ...baseProfile, studentName: "Dato histórico", mode: null, obligations: [], activityFunds: [] }
      : baseProfile);
    renderProfile();
    await screen.findByText("Primera cuota");
    fireEvent.change(screen.getByLabelText("Año"), { target: { value: String(previousYear) } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await waitFor(() => expect(profile).toHaveBeenCalledWith(previousYear));
    await waitFor(() => expect(screen.queryByText("Primera cuota")).not.toBeInTheDocument());
    expect(screen.getByText(baseProfile.studentName)).toBeInTheDocument();
    expect(screen.queryByText("Dato histórico")).not.toBeInTheDocument();
    expect(screen.getByText(baseProfile.guardianPhone)).toBeInTheDocument();
  });

  it.each([true, false])("muestra el mismo pago familiar para el apoderado principal=%s en solo lectura", async primaryGuardian => {
    profile.mockResolvedValue({ ...baseProfile, primaryGuardian, activityFunds: [{
      id: 1, title: 'Paseo del curso', expected: 1500, paid: 1500, remaining: 0, status: 'PAID',
      payments: [{ requestId: 'family-payment-1', amount: 1500, date: '2026-01-01', recordedAt: null, reference: 'Pago familiar', active: true }],
    }] });
    renderProfile();
    const section = await screen.findByRole('region', { name: 'Fondos por actividad' });
    expect(within(section).getByText(/Recibido:.*1.500/)).toBeInTheDocument();
    expect(within(section).getByText('Pagado')).toBeInTheDocument();
    fireEvent.click(within(section).getByText('Paseo del curso'));
    expect(within(section).getByRole('list', { name: 'Pagos de Paseo del curso' }).children).toHaveLength(1);
    expect(within(section).getByText('Pago familiar')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).not.toBeInTheDocument();
  });

  it("distingue pagos anulados del total recibido y muestra los extras familiares", async () => {
    profile.mockResolvedValue({ ...baseProfile, activityFunds: [{ id: 1, title: 'Bus', expected: 1500, paid: 2300, remaining: 0, status: 'PAID',
      payments: [{ requestId: 'old', amount: 1500, date: '2026-01-01', active: false }, { requestId: 'new', amount: 2300, date: '2026-01-02', active: true }] }] });
    renderProfile();
    const section = await screen.findByRole('region', { name: 'Fondos por actividad' });
    fireEvent.click(within(section).getByText('Bus'));
    expect(within(section).getByText(/Recibido:.*2.300/)).toBeInTheDocument();
    expect(within(section).getByText('Extra recibido')).toBeInTheDocument();
    expect(within(section).getByText(/800/)).toBeInTheDocument();
    expect(within(section).getByText('Anulado')).toBeInTheDocument();
  });

  it("muestra el loader centralizado durante la carga inicial del perfil familiar", () => {
    profile.mockReturnValue(new Promise(() => undefined));
    const { container } = renderProfile();

    expect(screen.queryByRole("status", { name: "Cargando vinculación familiar" })).not.toBeInTheDocument();
    expect(container.querySelector(".app-loader")).not.toBeInTheDocument();
    expect(container.querySelector(".profile-family-skeleton")).toBeNull();
  });

  it("reutiliza durante un minuto el perfil cargado para el mismo usuario y aÃ±o", async () => {
    const first = renderProfile();
    expect(await screen.findByText("Apoderado principal")).toBeInTheDocument();
    first.unmount();

    renderProfile();
    expect(await screen.findByText("Apoderado principal")).toBeInTheDocument();
    expect(profile).toHaveBeenCalledTimes(1);
  });

  it("muestra los datos reales de cuenta y familia", async () => {
    renderProfile();
    expect(screen.getByRole("heading", { name: "Juan Díaz" })).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(await screen.findByText("Apoderado principal")).toBeInTheDocument();
    expect(screen.getAllByText("FAM-008")).toHaveLength(1);
    expect(screen.getByText("SOFÍA DÍAZ")).toBeInTheDocument();
    expect(screen.getByText("Información importante del alumno")).toBeInTheDocument();
    expect(screen.getByText("Retirar el viernes a las 13:00.")).toBeInTheDocument();
  });

  it("permite cancelar el cierre de sesion desde el mismo boton", async () => {
    vi.useFakeTimers();
    try {
      logout.mockResolvedValue(undefined);
      renderProfile();

      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
      expect(screen.getByRole("button", { name: "Cancelar cierre" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar cierre" }));
      await act(async () => vi.advanceTimersByTimeAsync(3000));

      expect(logout).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cierra sesion al completar la barra del boton", async () => {
    vi.useFakeTimers();
    try {
      logout.mockResolvedValue(undefined);
      renderProfile();

      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
      expect(logout).not.toHaveBeenCalled();

      await act(async () => vi.advanceTimersByTimeAsync(3000));

      expect(logout).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("permite modificar solamente el nombre y sincroniza la sesión", async () => {
    const updated = {
      id: 1, code: "USR-001", nombre: "Juan Andrés Díaz", correo: "juandiaz@mail.com",
      rol: "USER", enabled: true, accountNonLocked: true, createdAt: "", updatedAt: "",
    };
    updateUser.mockResolvedValue(updated);
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
    expect(screen.getByRole("dialog", { name: "Editar perfil" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "  Juan  Andrés Díaz  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(1, {
      nombre: "Juan Andrés Díaz",
    }));
    expect(syncUser).toHaveBeenCalledWith(updated);
  });

  it("muestra aportes pendientes y modalidad de dos cuotas", async () => {
    renderProfile();
    expect(await screen.findByText("Aporte CEPA")).toBeInTheDocument();
    expect(screen.getByText("Fondo de Apoyo por Fallecimiento")).toBeInTheDocument();
    expect(screen.getAllByText("Pendiente")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Cuota del curso" })).toBeInTheDocument();
    expect(screen.getByText("Dos cuotas")).toBeInTheDocument();
    expect(screen.getByText("2 cuotas pendientes")).toBeInTheDocument();
    expect(screen.getByText("$70.000")).toBeInTheDocument();
    expect(screen.getByText("Total pendiente")).toBeInTheDocument();
    expect(screen.getByText("15-04-2026")).toBeInTheDocument();
    expect(screen.getByText("15-07-2026")).toBeInTheDocument();
    expect(screen.getAllByText("$35.000")).toHaveLength(2);
  });

  it("permite cambiar solo el teléfono y actualiza el dato familiar visible", async () => {
    updateUser.mockResolvedValue(vi.mocked(useAuth)().user);
    renderProfile();
    await screen.findByText("Apoderado principal");
    fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
    expect(screen.getByLabelText("Teléfono")).toHaveValue("+56912345678");
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "+56 9 8765 4321" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(1, {
      nombre: "Juan Díaz", telefono: "+56987654321",
    }));
    expect(await screen.findByText("+56987654321")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no guarda un teléfono inválido ni elimina el teléfono al cancelar", async () => {
    renderProfile();
    await screen.findByText("Apoderado principal");
    fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("aria-invalid", "true");
    expect(updateUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("+56912345678")).toBeInTheDocument();
  });

  it("bloquea el fondo, contiene el foco y restaura la edición al cerrar con Escape", async () => {
    renderProfile();
    await screen.findByText("Apoderado principal");
    const edit = screen.getByRole("button", { name: "Editar perfil" });
    edit.focus();
    fireEvent.click(edit);
    expect(document.body.style.overflow).toBe("hidden");
    const close = screen.getByRole("button", { name: "Cerrar edición" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(edit).toHaveFocus();
  });

  it("muestra al apoderado secundario la misma información financiera familiar", async () => {
    profile.mockResolvedValue({ ...baseProfile, primaryGuardian: false });
    renderProfile();
    expect(await screen.findByText("Apoderado secundario")).toBeInTheDocument();
    expect(screen.getByText("Aporte CEPA")).toBeInTheDocument();
    expect(screen.getByText("2 cuotas pendientes")).toBeInTheDocument();
    expect(screen.getByText("$70.000")).toBeInTheDocument();
    expect(screen.getByText("Retirar el viernes a las 13:00.")).toBeInTheDocument();
  });

  it("no muestra la cuota del curso si no existe modalidad", async () => {
    profile.mockResolvedValue({ ...baseProfile, mode: undefined, obligations: [] });
    renderProfile();
    expect(await screen.findByText("Aporte CEPA")).toBeInTheDocument();
    expect(screen.queryByText(/Cuota del curso/)).not.toBeInTheDocument();
  });
});
