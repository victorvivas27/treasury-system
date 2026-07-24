import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditarFamiliaForm } from "../EditarFamiliaForm";
import { useEditFamilia } from "@/presentation/hooks/familia/useEditFamilia";

vi.mock("@/presentation/hooks/familia/useEditFamilia", () => ({
  useEditFamilia: vi.fn(),
}));

describe("EditarFamiliaForm", () => {
  const handleApoderadoChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditFamilia).mockReturnValue({
      formData: {
        alumnoId: 1,
        observacionesGenerales: "",
        apoderados: [
          { apoderadoId: 1, parentesco: "Madre", esPrincipal: true },
          { apoderadoId: 2, parentesco: "Padre", esPrincipal: false },
        ],
      },
      familiaData: {
        familiaId: 1,
        codigoFamilia: "FAM-12345678",
        alumno: {
          alumnoId: 1,
          codigo: "AL-12345678",
          nombre: "JUAN PEREZ",
        },
        apoderados: [
          {
            apoderadoId: 1,
            codigo: "AP-12345678",
            nombre: "MARIA PEREZ",
            email: "maria@example.com",
            telefono: "912345678",
            relacion: { parentesco: "Madre", esPrincipal: true },
          },
          {
            apoderadoId: 2,
            codigo: "AP-87654321",
            nombre: "PEDRO PEREZ",
            email: "pedro@example.com",
            telefono: "987654321",
            relacion: { parentesco: "Padre", esPrincipal: false },
          },
        ],
      },
      loading: false,
      initialLoading: false,
      fieldErrors: {},
      error: null,
      modal: { isOpen: false, message: "", type: "success" },
      handleChange: vi.fn(),
      handleApoderadoChange,
      handleSubmit: vi.fn(),
      setModal: vi.fn(),
      navigate: vi.fn(),
      loadError: null,
      edit: vi.fn(),
    });
  });

  it("[EditarFamiliaForm #01] Debe mostrar todos los apoderados de la familia", () => {
    render(<EditarFamiliaForm />);

    expect(screen.getByText("MARIA PEREZ (AP-12345678)")).toBeInTheDocument();
    expect(screen.getByText("PEDRO PEREZ (AP-87654321)")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("[EditarFamiliaForm #02] Debe permitir seleccionar al secundario como principal", () => {
    render(<EditarFamiliaForm />);

    fireEvent.click(screen.getAllByRole("radio")[1]);

    expect(handleApoderadoChange).toHaveBeenCalledWith(1, expect.any(Object));
  });
});
