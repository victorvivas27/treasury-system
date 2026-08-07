import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FamilyContributionsPage } from "./FamilyContributionsPage";

const { listContributions, contributionSummary } = vi.hoisted(() => ({
  listContributions: vi.fn(),
  contributionSummary: vi.fn(),
}));

vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () {
    return { listContributions, contributionSummary };
  }),
}));

vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ user: { rol: "ADMIN" } }),
}));

describe("FamilyContributionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listContributions.mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({
      familyId: index + 1,
      familyCode: `FAM-${index + 1}`,
      studentName: `Alumno ${index + 1}`,
      course: "1A",
    })));
    contributionSummary.mockResolvedValue({
      totalFamilies: 4,
      cepaPaid: 0,
      cepaPending: 4,
      solidarityPaid: 0,
      solidarityPending: 4,
      fullyPaid: 0,
      withPending: 4,
    });
  });

  it("pagina los aportes de tres en tres", async () => {
    render(<FamilyContributionsPage />);

    await waitFor(() => expect(screen.getByText("Familia FAM-1")).toBeInTheDocument());
    expect(screen.getByText("Familia FAM-3")).toBeInTheDocument();
    expect(screen.queryByText("Familia FAM-4")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    expect(screen.getByText("Familia FAM-4")).toBeInTheDocument();
    expect(screen.queryByText("Familia FAM-1")).not.toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });
});
