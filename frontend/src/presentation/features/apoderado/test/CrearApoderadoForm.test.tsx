import { useCreateApoderado } from "@/presentation/hooks/apoderado/useCreateApoderado";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrearApoderadoForm } from "../CrearApoderadoForm";

vi.mock("@/presentation/hooks/apoderado/useCreateApoderado", () => ({
  useCreateApoderado: vi.fn(),
}));

describe("CrearApoderadoForm", () => {
  const mockHandleChange = vi.fn();
  const mockHandleActionSubmit = vi.fn();
  const mockNavigate = vi.fn();
  const mockSetModal = vi.fn();

  const defaultHookValue = {
    formData: { nombre: "", email: "", telefono: "", observaciones: "" },
    loading: false,
    fieldErrors: {},
    modal: { isOpen: false, message: "", type: "success" },
    handleChange: mockHandleChange,
    handleActionSubmit: mockHandleActionSubmit,
    navigate: mockNavigate,
    setModal: mockSetModal,
  };

  const renderForm = (hookOverrides = {}) => {
    (useCreateApoderado as any).mockReturnValue({ ...defaultHookValue, ...hookOverrides });
    render(<CrearApoderadoForm />);
  };

  const getInputs = () => ({
    nombre: screen.getByPlaceholderText(/Juan Carlos Perez/i),
    email: screen.getByPlaceholderText(/ejemplo@email.com/i),
    telefono: screen.getByRole("textbox", { name: /número de teléfono/i }),
  });

  const getButton = () => screen.getAllByRole("button")[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[CrearApoderadoForm #01] debe renderizar todos los campos de entrada básicos", () => {
    renderForm();
    const { nombre, email, telefono } = getInputs();
    expect(nombre).toBeInTheDocument();
    expect(email).toBeInTheDocument();
    expect(telefono).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /observaciones/i })).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #02] debe mostrar mensajes de error cuando fieldErrors tiene datos", () => {
    renderForm({ fieldErrors: { nombre: "El nombre es obligatorio" } });
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #03] debe aplicar clase error y mostrar mensajes en todos los campos", () => {
    renderForm({
      fieldErrors: {
        nombre: "Error nombre",
        email: "Error email",
        telefono: "Error telefono"
      }
    });

    const { nombre, email, telefono } = getInputs();
    expect(nombre).toHaveClass("input-error");
    expect(email).toHaveClass("input-error");
    expect(telefono).toHaveClass("input-error");
    expect(screen.getByText("Error nombre")).toBeInTheDocument();
    expect(screen.getByText("Error email")).toBeInTheDocument();
    expect(screen.getByText("Error telefono")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #04] debe llamar a handleChange al escribir en los inputs", () => {
    renderForm();
    fireEvent.change(getInputs().nombre, { target: { value: "John Doe", name: "nombre" } });
    expect(mockHandleChange).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #05] debe llamar a handleActionSubmit al hacer clic en el botón", () => {
    renderForm();
    fireEvent.click(getButton());
    expect(mockHandleActionSubmit).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #06] debe mostrar estado de carga y deshabilitar botón", () => {
    renderForm({ loading: true });
    const button = getButton();
    expect(button).toBeDisabled();
    expect(screen.getByText("Creando Apoderado")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #07] debe mostrar el ModalAlert cuando modal.isOpen es true", () => {
    renderForm({ modal: { isOpen: true, message: "¡Éxito!", type: "success" } });
    expect(screen.getByText("¡Éxito!")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #08] no debe navegar si el modal es de tipo error", () => {
    renderForm({ modal: { isOpen: true, message: "Error", type: "error" } });
    fireEvent.click(screen.getByText(/entendido/i));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetModal).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #09] debe cerrar el modal correctamente al hacer clic en entendido", () => {
    renderForm({ modal: { isOpen: true, message: "Cerrando modal", type: "success" } });
    fireEvent.click(screen.getByText(/entendido/i));

    expect(mockSetModal).toHaveBeenCalled();
    const updater = mockSetModal.mock.calls[0][0];
    const stateSimulated = updater({ isOpen: true, message: "", type: "success" });
    expect(stateSimulated.isOpen).toBe(false);
  });

  it("[CrearApoderadoForm #10] debe combinar el prefijo del país con los dígitos del teléfono", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/país y prefijo telefónico/i), {
      target: { value: "AR" },
    });
    fireEvent.change(getInputs().telefono, { target: { value: "9 717-8283" } });

    expect(mockHandleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: "telefono", value: "+5497178283" }),
      }),
    );
  });
});
