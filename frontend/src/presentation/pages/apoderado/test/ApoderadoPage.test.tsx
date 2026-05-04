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
  it("[ApoderadoPage #04] Debe navegar a la ruta de edición con el ID correcto al hacer clic en editar un apoderado", () => {
    // 1. Mock de datos con apoderados
    const mockApoderados = [
      { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
      { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
    ];

    // 2. Configurar el mock de useApoderados con datos
    vi.mocked(useApoderados).mockReturnValue({
      apoderados: mockApoderados,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    // 3. Renderizar el componente
    render(<ApoderadoPage />);

    // 4. Buscar el botón de editar del primer apoderado (ID: 1)
    // Usamos testId que viene del componente ApoderadosList
    const editButton = screen.getByTestId(`edit-btn-1`);

    // 5. Simular clic
    fireEvent.click(editButton);

    // 6. Verificar que navegó a la ruta correcta con el ID
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/parents/edit/1");
  });

  it("[ApoderadoPage #05] Debe navegar a la ruta de edición con el ID del segundo apoderado", () => {
    const mockApoderados = [
      { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
      { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
    ];

    vi.mocked(useApoderados).mockReturnValue({
      apoderados: mockApoderados,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ApoderadoPage />);

    // Buscar botón de editar del segundo apoderado (ID: 2)
    const editButton = screen.getByTestId(`edit-btn-2`);
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/parents/edit/2");
  });
});
