import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApoderadoPage } from "../ApoderadoPage";


// 1. Mocks de las dependencias externas
vi.mock("@/presentation/hooks/apoderado/useApoderados");
vi.mock("react-router-dom");

describe("ApoderadoPage Integration", () => {
  const mockNavigate = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    // Configuración por defecto de los mocks antes de cada test
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useApoderados).mockReturnValue({
      apoderados: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("[ApoderadoPage #01] Debe navegar a la ruta de creación al hacer clic en 'Crear Apoderado'.", () => {
    render(<ApoderadoPage />);

    const btnCreate = screen.getByRole("button", { name: /crear apoderado/i });
    fireEvent.click(btnCreate);

    expect(mockNavigate).toHaveBeenCalledWith("/parents/new");
  });

  it("[ApoderadoPage #02] Debe ejecutar refetch al hacer clic en el botón de recargar.", () => {
    render(<ApoderadoPage />);

    const btnReload = screen.getByRole("button", { name: /recargar/i });
    fireEvent.click(btnReload);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("[ApoderadoPage #03] El botón de recargar debe mostrar estado de carga cuando loading es true.", () => {
    // Simulamos que el hook está en estado loading
    vi.mocked(useApoderados).mockReturnValue({
      apoderados: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ApoderadoPage />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    const btnReload = screen.getByRole("button", { name: /cargando/i });
    expect(btnReload).toBeDisabled(); // Asumiendo que tu Button maneja el atributo disabled en loading
  });
});
