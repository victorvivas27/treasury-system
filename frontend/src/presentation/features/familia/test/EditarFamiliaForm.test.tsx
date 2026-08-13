import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditarFamiliaForm } from "../EditarFamiliaForm";
import { useEditFamilia } from "@/presentation/hooks/familia/useEditFamilia";

vi.mock("@/presentation/hooks/familia/useEditFamilia", () => ({
  useEditFamilia: vi.fn(),
}));

describe("EditarFamiliaForm", () => {
  const handleApoderadoChange = vi.fn();
  const addApoderado = vi.fn();
  const removeApoderado = vi.fn();
  const setParentesco = vi.fn();

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
      setParentesco,
      addApoderado,
      removeApoderado,
      handleSubmit: vi.fn(),
      setModal: vi.fn(),
      navigate: vi.fn(),
      loadError: null,
      apoderados: [],
      loadingApoderados: false,
      apoderadosError: null,
      edit: vi.fn(),
    });
  });

  it("[EditarFamiliaForm #01] Debe mostrar todos los apoderados de la familia", () => {
    render(<EditarFamiliaForm />);

    expect(screen.getByRole("combobox", { name: "Seleccionar apoderado 1" }))
      .toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Seleccionar apoderado 2" }))
      .toHaveValue("2");
    expect(screen.getAllByRole("button", { name: /parentesco del apoderado/i })).toHaveLength(2);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("[EditarFamiliaForm #02.1] permite reemplazar y quitar apoderados existentes", () => {
    render(<EditarFamiliaForm />);

    fireEvent.change(screen.getByRole("combobox", { name: "Seleccionar apoderado 1" }),
      { target: { name: "apoderadoId", value: "3" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[1]);

    expect(handleApoderadoChange).toHaveBeenCalledWith(0, expect.any(Object));
    expect(removeApoderado).toHaveBeenCalledWith(1);
  });

  it("[EditarFamiliaForm #02] Debe permitir seleccionar al secundario como principal", () => {
    render(<EditarFamiliaForm />);

    fireEvent.click(screen.getAllByRole("radio")[1]);

    expect(handleApoderadoChange).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it("[EditarFamiliaForm #03] Debe permitir agregar un segundo apoderado cuando existe uno solo", () => {
    vi.mocked(useEditFamilia).mockReturnValue({
      ...vi.mocked(useEditFamilia)(),
      formData: {
        alumnoId: 1,
        observacionesGenerales: "",
        apoderados: [{ apoderadoId: 1, parentesco: "Madre", esPrincipal: true }],
      },
      familiaData: {
        ...vi.mocked(useEditFamilia)().familiaData!,
        apoderados: [vi.mocked(useEditFamilia)().familiaData!.apoderados[0]],
      },
    });

    render(<EditarFamiliaForm />);
    fireEvent.click(screen.getByRole("button", { name: /agregar segundo apoderado/i }));

    expect(addApoderado).toHaveBeenCalledOnce();
  });

  it("[EditarFamiliaForm #04] Debe mostrar las observaciones en una sección opcional", () => {
    render(<EditarFamiliaForm />);

    const textarea = screen.getByLabelText("Observaciones generales");
    const summary = screen.getByText("Observaciones");

    expect(summary.closest("summary")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("name", "observacionesGenerales");
  });
});
