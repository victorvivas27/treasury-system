import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImprovementAdminPage } from "./ImprovementAdminPage";

const { adminList, adminSummary, adminDetail, updateStatus, updatePriority, notes,
  addNote, history, relate, deleteAdmin, apiGet } = vi.hoisted(() => ({
  adminList: vi.fn(),
  adminSummary: vi.fn(),
  adminDetail: vi.fn(),
  updateStatus: vi.fn(),
  updatePriority: vi.fn(),
  notes: vi.fn(),
  addNote: vi.fn(),
  history: vi.fn(),
  relate: vi.fn(),
  deleteAdmin: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock("@/core/C-infra/repositories/improvement/ImprovementSuggestionRepositoryImpl", () => ({
  ImprovementSuggestionRepositoryImpl: class {
    adminList = adminList;
    adminSummary = adminSummary;
    adminDetail = adminDetail;
    updateStatus = updateStatus;
    updatePriority = updatePriority;
    notes = notes;
    addNote = addNote;
    history = history;
    relate = relate;
    deleteAdmin = deleteAdmin;
  },
}));

vi.mock("@/shared/ui/modalalert/ModalAler", () => ({
  ModalAlert: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <p>{message}</p> : null,
}));

vi.mock("@/core/D-config/api", () => ({
  apiClient: {
    defaults: { baseURL: "http://localhost:5055/tesoreria/api/v1" },
    get: apiGet,
  },
}));

const suggestion = {
  id: 27,
  category: "PAYMENTS",
  selectedItems: ["Mas filtros"],
  title: "Filtrar pagos",
  description: "Necesito filtrar por metodo.",
  userImpact: "DIFFICULT",
  internalPriority: "MEDIUM",
  screenshotUrl: "/admin/improvements/27/screenshot",
  sourceRoute: "/tesoreria/pagos",
  status: "RECEIVED",
  userId: 10,
  userName: "Camila Rojas",
  userEmail: "camila@test.cl",
  userRole: "USER",
  organizationId: 3,
  organizationName: "Tesoreria 6B",
  courseName: "6B",
  schoolYear: 2026,
  relatedSuggestionIds: [],
  createdAt: "2026-09-01T10:00:00",
  updatedAt: "2026-09-01T10:00:00",
};

describe("ImprovementAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminList.mockResolvedValue({ content: [suggestion], page: 0, size: 10,
      totalElements: 1, totalPages: 1 });
    adminSummary.mockResolvedValue({ total: 1, received: 1, underReview: 0,
      planned: 0, implemented: 0, critical: 0 });
    adminDetail.mockResolvedValue(suggestion);
    notes.mockResolvedValue([]);
    history.mockResolvedValue([]);
    updateStatus.mockResolvedValue({ ...suggestion, status: "UNDER_REVIEW" });
    updatePriority.mockResolvedValue({ ...suggestion, internalPriority: "HIGH" });
    addNote.mockResolvedValue({ id: 1, authorUserId: 20, authorName: "Admin",
      authorEmail: "admin@test.cl", content: "Revisar.", createdAt: "2026-09-01T11:00:00",
      updatedAt: "2026-09-01T11:00:00" });
    relate.mockResolvedValue({ ...suggestion, relatedSuggestionIds: [30] });
    deleteAdmin.mockResolvedValue(undefined);
    apiGet.mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:captura");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renderiza resumen, listado y detalle administrativo", async () => {
    render(<ImprovementAdminPage />);

    expect(await screen.findByRole("heading", { name: "Gestión de Mejoras" }))
      .toBeInTheDocument();
    expect(screen.getByText(/#27 Filtrar pagos/)).toBeInTheDocument();
    expect(screen.getByText("Tesoreria 6B")).toBeInTheDocument();
    expect(screen.getByText("Necesito filtrar por metodo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver captura adjunta" })).toBeInTheDocument();
    expect(adminList).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 10 }));
  });

  it("permite filtrar y mutar estado, prioridad y notas", async () => {
    render(<ImprovementAdminPage />);

    await screen.findByText(/#27 Filtrar pagos/);
    fireEvent.change(screen.getByPlaceholderText("ID, título, descripción o usuario"),
      { target: { value: "pagos" } });
    await waitFor(() => expect(adminList).toHaveBeenLastCalledWith(expect.objectContaining({
      search: "pagos",
    })));

    const detail = screen.getByLabelText("Detalle administrativo");
    fireEvent.change(within(detail).getByLabelText("Estado"), { target: { value: "UNDER_REVIEW" } });
    await waitFor(() => expect(updateStatus).toHaveBeenCalledWith(27, "UNDER_REVIEW"));

    fireEvent.change(within(detail).getByLabelText("Prioridad interna"), { target: { value: "HIGH" } });
    await waitFor(() => expect(updatePriority).toHaveBeenCalledWith(27, "HIGH"));

    fireEvent.change(within(detail).getByLabelText("Nota interna"), { target: { value: "Revisar." } });
    fireEvent.click(within(detail).getByRole("button", { name: "Agregar nota" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(27, "Revisar."));

    fireEvent.click(within(detail).getByRole("button", { name: "Ver captura adjunta" }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith(
      "/admin/improvements/27/screenshot", { responseType: "blob" },
    ));
    expect(window.open).toHaveBeenCalledWith("blob:captura", "_blank", "noopener,noreferrer");
  });

  it("confirma y elimina definitivamente una mejora", async () => {
    render(<ImprovementAdminPage />);

    const detail = await screen.findByLabelText("Detalle administrativo");
    fireEvent.click(within(detail).getByRole("button", { name: "Eliminar definitivamente" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar definitivamente" }));

    await waitFor(() => expect(deleteAdmin).toHaveBeenCalledWith(27));
    expect(await screen.findByText("Mejora eliminada definitivamente.")).toBeInTheDocument();
  });
});
