import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApoderadoPage } from "../ApoderadoPage";

vi.mock("@/presentation/hooks/apoderado/useApoderados");
vi.mock("react-router-dom");

describe("ApoderadoPage Integration", () => {
  const mockNavigate = vi.fn();
  const mockRefetch = vi.fn();
  const mockPagination = {
    currentPage: 0,
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    hasPrevPage: false,
    hasNextPage: false,
    isLastPage: true,
    pageSize: 3,
    totalPages: 1,
    totalElements: 0,
  };

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useApoderados).mockReturnValue({
      apoderados: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
      ...mockPagination,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("[ApoderadoPage #01] Debe navegar a la ruta de creacion al hacer clic en Crear Apoderado.", () => {
    render(<ApoderadoPage />);

    const btnCreate = screen.getByRole("button", { name: /crear apoderado/i });
    fireEvent.click(btnCreate);

    expect(mockNavigate).toHaveBeenCalledWith("/parents/new");
  });

  it("[ApoderadoPage #02] Debe ejecutar refetch al hacer clic en el boton de recargar.", () => {
    render(<ApoderadoPage />);

    const btnReload = screen.getByRole("button", { name: /recargar/i });
    fireEvent.click(btnReload);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("[ApoderadoPage #03] El boton de recargar debe mostrar estado de carga cuando loading es true.", () => {
    vi.mocked(useApoderados).mockReturnValue({
      apoderados: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
      ...mockPagination,
    });

    render(<ApoderadoPage />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    const btnReload = screen.getByRole("button", { name: /cargando/i });
    expect(btnReload).toBeDisabled();
  });

  it("[ApoderadoPage #04] Debe navegar a la ruta de edicion con el ID correcto al hacer clic en editar.", () => {
    const mockApoderados = [
      { id: 1, nombre: "Juan Perez", email: "juan@example.com", telefono: "987654321" },
      { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
    ];

    vi.mocked(useApoderados).mockReturnValue({
      apoderados: mockApoderados,
      loading: false,
      error: null,
      refetch: mockRefetch,
      ...mockPagination,
      totalElements: mockApoderados.length,
    });

    render(<ApoderadoPage />);

    fireEvent.click(screen.getByTestId("edit-btn-1"));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/parents/edit/1");
  });

  it("[ApoderadoPage #05] Debe navegar a la ruta de edicion con el ID del segundo apoderado.", () => {
    const mockApoderados = [
      { id: 1, nombre: "Juan Perez", email: "juan@example.com", telefono: "987654321" },
      { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
    ];

    vi.mocked(useApoderados).mockReturnValue({
      apoderados: mockApoderados,
      loading: false,
      error: null,
      refetch: mockRefetch,
      ...mockPagination,
      totalElements: mockApoderados.length,
    });

    render(<ApoderadoPage />);

    fireEvent.click(screen.getByTestId("edit-btn-2"));

    expect(mockNavigate).toHaveBeenCalledWith("/parents/edit/2");
  });
});
