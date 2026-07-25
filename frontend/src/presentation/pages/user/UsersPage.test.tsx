import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/presentation/context/AuthContext";
import { useUsers } from "@/presentation/hooks/user/useUsers";
import { UsersPage } from "./UsersPage";

vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/presentation/hooks/user/useUsers", () => ({ useUsers: vi.fn() }));

describe("UsersPage", () => {
  it("[UsersPage #01] solicita confirmación antes de eliminar", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, rol: "ADMIN" },
    } as ReturnType<typeof useAuth>);
    vi.mocked(useUsers).mockReturnValue({
      users: [{
        id: 2,
        code: "USR-ABCDEFGH",
        nombre: "Ana Pérez",
        correo: "ana@mail.com",
        rol: "USER",
        enabled: true,
        accountNonLocked: true,
        createdAt: "",
        updatedAt: "",
      }],
      loading: false,
      error: null,
      totalPages: 1,
      load: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      changeRole: vi.fn(),
      remove,
    });

    render(<UsersPage />);

    fireEvent.click(screen.getByTestId("delete-btn-2"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("delete-btn-2"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(2));
  });
});
