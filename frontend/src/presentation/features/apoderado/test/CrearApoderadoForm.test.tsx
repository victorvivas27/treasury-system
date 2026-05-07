import { useCreateApoderado } from "@/presentation/hooks/apoderado/useCreateApoderado";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrearApoderadoForm } from "../CrearApoderadoForm";

// Mock del hook personalizado
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

  beforeEach(() => {
    vi.clearAllMocks();
    (useCreateApoderado as any).mockReturnValue(defaultHookValue);
  });

  it("[CrearApoderadoForm #01] debe renderizar todos los campos de entrada básicos", () => {
    render(<CrearApoderadoForm />);
    expect(screen.getByPlaceholderText(/Juan Carlos Perez/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ejemplo@email.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+56 9/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /observaciones/i })).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #02] debe mostrar mensajes de error cuando fieldErrors tiene datos", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      fieldErrors: { nombre: "El nombre es obligatorio" },
    });

    render(<CrearApoderadoForm />);
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #03] debe aplicar la clase CSS 'input-error' y mostrar mensajes en todos los campos", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      fieldErrors: {
        nombre: "Error nombre",
        email: "Error email",
        telefono: "Error telefono"
      },
    });

    render(<CrearApoderadoForm />);

    const inputNombre = screen.getByPlaceholderText(/Juan Carlos Perez/i);
    const inputEmail = screen.getByPlaceholderText(/ejemplo@email.com/i);
    const inputTelefono = screen.getByPlaceholderText(/\+56 9/i);

    // Verificamos clases (Coverage de className)
    expect(inputNombre).toHaveClass("input-error");
    expect(inputEmail).toHaveClass("input-error");
    expect(inputTelefono).toHaveClass("input-error");

    // Verificamos mensajes (Coverage de los spans de error)
    expect(screen.getByText("Error nombre")).toBeInTheDocument();
    expect(screen.getByText("Error email")).toBeInTheDocument();
    expect(screen.getByText("Error telefono")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #04] debe llamar a handleChange al escribir en los inputs", () => {
    render(<CrearApoderadoForm />);
    const inputNombre = screen.getByPlaceholderText(/Juan Carlos Perez/i);

    fireEvent.change(inputNombre, { target: { value: "John Doe", name: "nombre" } });
    expect(mockHandleChange).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #05] debe llamar a handleActionSubmit al hacer clic en el botón", () => {
    render(<CrearApoderadoForm />);
    const button = screen.getByRole("button", { name: /Crear Apoderado/i });

    fireEvent.click(button);
    expect(mockHandleActionSubmit).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #06] debe mostrar estado de carga y deshabilitar botón", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      loading: true,
    });

    render(<CrearApoderadoForm />);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(screen.getByText("Creando Apoderado")).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #07] debe mostrar el ModalAlert con el mensaje correcto cuando modal.isOpen es true", () => {
    const mensajePrueba = "¡Apoderado creado con éxito!";
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: mensajePrueba, type: "success" },
    });

    render(<CrearApoderadoForm />);
    expect(screen.getByText(mensajePrueba)).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #08] no debe navegar si el modal es de tipo error", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Error", type: "error" },
    });

    render(<CrearApoderadoForm />);
    const closeButton = screen.getByText(/entendido/i);
    fireEvent.click(closeButton);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetModal).toHaveBeenCalled();
  });

  it("[CrearApoderadoForm #09] debe navegar a /parents cuando el modal es exitoso y se cierra", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Éxito", type: "success" },
    });

    render(<CrearApoderadoForm />);
    const closeButton = screen.getByText(/entendido/i);
    fireEvent.click(closeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  it("[CrearApoderadoForm #10] debe mostrar el icono de carga en el botón", () => {
    render(<CrearApoderadoForm />);
    const button = screen.getByRole("button", { name: /Crear Apoderado/i });
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("[CrearApoderadoForm #11] debe llamar a setModal para cerrar el modal correctamente", () => {
    (useCreateApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Cerrando modal", type: "success" },
    });

    render(<CrearApoderadoForm />);

    // Buscamos el botón que dispara el onClose
    const closeButton = screen.getByText(/entendido/i);
    fireEvent.click(closeButton);

    // Verificamos que se llamó a la función setModal
    expect(mockSetModal).toHaveBeenCalled();

    // Este paso es el que "limpia" el coverage de la función flecha (prev => ...)
    const updater = mockSetModal.mock.calls[0][0];
    const stateSimulated = updater({ isOpen: true, message: "", type: "success" });
    expect(stateSimulated.isOpen).toBe(false);
  });
});
