import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { clearProfileCache, ProfilePage } from "./ProfilePage";

const profile = vi.hoisted(() => vi.fn());
vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/core/B-application/use-cases/treasury/TreasuryUseCases", () => ({
  TreasuryUseCases: class { profile = profile; },
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
    } as ReturnType<typeof useAuth>);
    profile.mockResolvedValue(baseProfile);
  });

  afterEach(() => vi.clearAllMocks());

  const renderProfile = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);

  it("muestra un skeleton con la estructura del perfil familiar", () => {
    profile.mockReturnValue(new Promise(() => undefined));
    const { container } = renderProfile();

    expect(container.querySelector(".profile-family-skeleton")).toBeInTheDocument();
    expect(container.querySelector(".profile-badge-skeleton")).toBeInTheDocument();
    expect(container.querySelector(".profile-student-message-skeleton")).toBeInTheDocument();
    expect(container.querySelectorAll(".profile-contribution-skeleton")).toHaveLength(2);
    expect(container.querySelectorAll(".profile-payment-skeleton .profile-course-installments > span"))
      .toHaveLength(2);
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

  it("muestra aportes pendientes y modalidad de dos cuotas", async () => {
    renderProfile();
    expect(await screen.findByText("Aporte CEPA")).toBeInTheDocument();
    expect(screen.getByText("Aporte solidario")).toBeInTheDocument();
    expect(screen.getAllByText("Pendiente")).toHaveLength(4);
    expect(screen.getByText("Cuota del curso · Dos cuotas")).toBeInTheDocument();
    expect(screen.getByText("2 cuotas pendientes")).toBeInTheDocument();
    expect(screen.getByText("$70.000")).toBeInTheDocument();
    expect(screen.getByText("Total cuota")).toBeInTheDocument();
    expect(screen.getByText("15-04-2026")).toBeInTheDocument();
    expect(screen.getByText("15-07-2026")).toBeInTheDocument();
    expect(screen.getAllByText("$35.000")).toHaveLength(2);
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
