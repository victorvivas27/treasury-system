import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OPEN_IMPROVEMENT_CENTER_EVENT } from "@/presentation/context/improvement/ImprovementCenterEvents";
import { ImprovementCenter } from "./ImprovementCenter";

const { createMock, mineMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  mineMock: vi.fn(),
}));

vi.mock("@/core/C-infra/repositories/improvement/ImprovementSuggestionRepositoryImpl", () => ({
  ImprovementSuggestionRepositoryImpl: class {
    create = createMock;
    mine = mineMock;
  },
}));

vi.mock("@/shared/ui/modalalert/ModalAler", () => ({
  ModalAlert: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <p>{message}</p> : null,
}));

describe("ImprovementCenter", () => {
  beforeEach(() => {
    createMock.mockReset();
    mineMock.mockReset();
    mineMock.mockResolvedValue([]);
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", { value: vi.fn(), writable: true });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:captura");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  const open = async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><ImprovementCenter /></MemoryRouter>);
    await act(async () => {
      window.dispatchEvent(new Event(OPEN_IMPROVEMENT_CENTER_EVENT));
    });
  };

  it("abre el Centro de Mejoras desde el evento global", async () => {
    await open();

    expect(screen.getByRole("dialog", { name: "Centro de Mejoras" })).toBeInTheDocument();
    expect(screen.getByText("Nueva sugerencia")).toBeInTheDocument();
  });

  it("valida que exista una categoría antes de enviar", async () => {
    await open();

    fireEvent.change(screen.getByLabelText("Resume tu sugerencia"), { target: { value: "Idea" } });
    fireEvent.change(screen.getByLabelText("Cuéntanos qué necesitas ver o entender mejor"),
      { target: { value: "Detalle suficiente" } });
    fireEvent.click(screen.getByText("Enviar sugerencia"));

    expect(await screen.findByText("Selecciona una categoría.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("envía una sugerencia válida y muestra confirmación", async () => {
    const screenshot = new File(["png"], "perfil-pagos.png", { type: "image/png" });
    createMock.mockResolvedValue({
      id: 123,
      category: "PAYMENTS",
      selectedItems: ["Ver cuotas pendientes"],
      title: "Filtrar pagos",
      description: "Necesito filtrar pagos por fecha.",
      userImpact: "USEFUL",
      screenshotUrl: null,
      sourceRoute: "/dashboard",
      status: "RECEIVED",
      createdAt: "2026-09-01T10:00:00",
      updatedAt: "2026-09-01T10:00:00",
    });
    await open();

    fireEvent.click(screen.getByText("Perfil de pagos"));
    fireEvent.click(screen.getByLabelText("Ver cuotas pendientes"));
    fireEvent.change(screen.getByLabelText("Resume tu sugerencia"),
      { target: { value: "Filtrar pagos" } });
    fireEvent.change(screen.getByLabelText("Cuéntanos qué necesitas ver o entender mejor"),
      { target: { value: "Necesito filtrar pagos por fecha." } });
    fireEvent.change(screen.getByLabelText("Captura opcional"), { target: { files: [screenshot] } });
    expect(screen.getByText("Preparando captura...")).toBeInTheDocument();
    expect(screen.getByText(/perfil-pagos\.png/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Enviar sugerencia"));

    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      category: "PAYMENTS",
      selectedItems: ["Ver cuotas pendientes"],
      sourceRoute: "/dashboard",
      screenshot,
    })));
    expect(await screen.findByText("Gracias. Tu sugerencia #123 fue enviada correctamente."))
      .toBeInTheDocument();
  });

  it("lista Mis sugerencias y permite abrir el detalle", async () => {
    mineMock.mockResolvedValue([{
      id: 8,
      category: "UX",
      selectedItems: ["Mejorar visualización móvil"],
      title: "Mejor mobile",
      description: "En mobile necesito ver mejor el panel.",
      userImpact: "DIFFICULT",
      screenshotUrl: null,
      sourceRoute: "/notifications",
      status: "UNDER_REVIEW",
      createdAt: "2026-09-01T10:00:00",
      updatedAt: "2026-09-01T10:00:00",
    }]);
    await open();

    fireEvent.click(screen.getByText("Mis sugerencias"));

    expect(await screen.findByText(/#8 Mejor mobile/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/#8 Mejor mobile/));
    expect(screen.getByText("En mobile necesito ver mejor el panel.")).toBeInTheDocument();
    expect(screen.getByText("En revisión")).toBeInTheDocument();
  });
});
