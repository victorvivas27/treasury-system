import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditApoderado } from "@/presentation/hooks/apoderado/useEditApoderado";
import { EditarApoderadoForm } from "../EditarApoderadoForm";

// Mock del hook
vi.mock("@/presentation/hooks/apoderado/useEditApoderado", () => ({
  useEditApoderado: vi.fn(),
}));

// Mock de navegación
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("EditarApoderadoForm", () => {
  const mockHandleChange = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockSetModal = vi.fn();

  const defaultHookValue = {
    formData: { nombre: "", email: "", telefono: "", observaciones: "" },
    loading: false,
    fieldErrors: {},
    modal: { isOpen: false, message: "", type: "success" },
    handleChange: mockHandleChange,
    handleSubmit: mockHandleSubmit,
    setModal: mockSetModal,
    navigate: mockNavigate,
    initialLoading: false,
    loadError: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditApoderado as any).mockReturnValue(defaultHookValue);
  });

  it("[EditarApoderadoForm #01] Debe precargar los datos del apoderado en los campos cuando initialLoading = false", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      formData: {
        nombre: "Juan Perez",
        email: "juan@test.com",
        telefono: "912345678",
        observaciones: "Test observaciones",
      },
    });

    render(<EditarApoderadoForm />);

    expect(screen.getByDisplayValue("Juan Perez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@test.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("912345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test observaciones")).toBeInTheDocument();
  });

  
  it("[EditarApoderadoForm #02] Debe mostrar skeletons mientras initialLoading = true", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      initialLoading: true,
    });

    render(<EditarApoderadoForm />);

    const skeletons = document.querySelectorAll(".skeleton-name");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // [ EditarApoderadoForm #03 ] Debe mostrar FeedbackState con error si loadError existe, sin renderizar el formulario
  it("[EditarApoderadoForm #03] Debe mostrar FeedbackState con error si loadError existe, sin renderizar el formulario", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      loadError: { message: "Error al cargar el apoderado" },
    });

    render(<EditarApoderadoForm />);

    expect(screen.getByText("Error al cargar el apoderado")).toBeInTheDocument();
    expect(screen.queryByText("Actualizar Apoderado")).not.toBeInTheDocument();
  });

  // [ EditarApoderadoForm #04 ] Al hacer submit exitoso, debe cerrar modal y navegar a "/parents"
  it("[EditarApoderadoForm #04] Al hacer submit exitoso, debe cerrar modal y navegar a /parents", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Actualizado correctamente", type: "success" },
    });

    render(<EditarApoderadoForm />);

    const closeButton = screen.getByRole("button", { name: /entendido/i });
    fireEvent.click(closeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  // [ EditarApoderadoForm #05 ] El botón debe cambiar texto a "Actualizando Apoderado" cuando loading = true
  it("[EditarApoderadoForm #05] El botón debe cambiar texto a 'Actualizando Apoderado' cuando loading = true", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      loading: true,
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByText("Actualizando Apoderado")).toBeInTheDocument();
  });

  // [ EditarApoderadoForm #06 ] Al recibir modal.type = "success", al cerrar el modal debe ejecutar la navegación
  it("[EditarApoderadoForm #06] Al recibir modal.type = success, al cerrar el modal debe ejecutar la navegación", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Éxito", type: "success" },
    });

    render(<EditarApoderadoForm />);

    const closeButton = screen.getByRole("button", { name: /entendido/i });
    fireEvent.click(closeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  // [ EditarApoderadoForm #07 ] Al cerrar el modal con error, NO debe navegar
  it("[EditarApoderadoForm #07] Al cerrar el modal con error, NO debe navegar", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Error al actualizar", type: "error" },
    });

    render(<EditarApoderadoForm />);

    const closeButton = screen.getByRole("button", { name: /entendido/i });
    fireEvent.click(closeButton);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // [ EditarApoderadoForm #08 ] Debe pasar disabled={loading} y loading={loading} al Button
  it("[EditarApoderadoForm #08] Debe pasar disabled y loading al Button", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      loading: true,
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // [ EditarApoderadoForm #09 ] Debe pasar value={formData.nombre} al input de nombre
  it("[EditarApoderadoForm #09] Debe pasar value={formData.nombre} al input de nombre", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      formData: { ...defaultHookValue.formData, nombre: "Carlos López" },
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByDisplayValue("Carlos López")).toBeInTheDocument();
  });

  // [ EditarApoderadoForm #10 ] Debe pasar value={formData.email} al input de email
  it("[EditarApoderadoForm #10] Debe pasar value={formData.email} al input de email", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      formData: { ...defaultHookValue.formData, email: "carlos@test.com" },
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByDisplayValue("carlos@test.com")).toBeInTheDocument();
  });

  // [ EditarApoderadoForm #11 ] Debe pasar value={formData.telefono} al input de teléfono
  it("[EditarApoderadoForm #11] Debe pasar value={formData.telefono} al input de teléfono", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      formData: { ...defaultHookValue.formData, telefono: "987654321" },
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByDisplayValue("987654321")).toBeInTheDocument();
  });

  // [ EditarApoderadoForm #12 ] Debe pasar value={formData.observaciones} al textarea
  it("[EditarApoderadoForm #12] Debe pasar value={formData.observaciones} al textarea", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      formData: { ...defaultHookValue.formData, observaciones: "Nota importante" },
    });

    render(<EditarApoderadoForm />);
    expect(screen.getByDisplayValue("Nota importante")).toBeInTheDocument();
  });


  it("[EditarApoderadoForm #13] Debe aplicar clase input-error y mostrar mensaje cuando fieldErrors.nombre existe", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      fieldErrors: { nombre: "El nombre es obligatorio" },
    });

    render(<EditarApoderadoForm />);

    const inputNombre = screen.getByPlaceholderText(/Juan Carlos Perez Example/i);
    expect(inputNombre).toHaveClass("input-error");
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  //
  it("[EditarApoderadoForm #14] Debe aplicar clase input-error y mostrar mensaje cuando fieldErrors.email existe", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      fieldErrors: { email: "El email es inválido" },
    });

    render(<EditarApoderadoForm />);

    const inputEmail = screen.getByPlaceholderText(/ejemplo@email.com/i);
    expect(inputEmail).toHaveClass("input-error");
    expect(screen.getByText("El email es inválido")).toBeInTheDocument();
  });

  //
  it("[EditarApoderadoForm #15] Debe aplicar clase input-error y mostrar mensaje cuando fieldErrors.telefono existe", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      fieldErrors: { telefono: "El teléfono es inválido" },
    });

    render(<EditarApoderadoForm />);

    const inputTelefono = screen.getByPlaceholderText(/\+56 9/i);
    expect(inputTelefono).toHaveClass("input-error");
    expect(screen.getByText("El teléfono es inválido")).toBeInTheDocument();
  });

  //
  it("[EditarApoderadoForm #16] Debe ejecutar setModal y navegar cuando modal.type es success", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Éxito", type: "success" },
    });

    render(<EditarApoderadoForm />);

    const closeButton = screen.getByRole("button", { name: /entendido/i });
    fireEvent.click(closeButton);

    // Verificar que setModal fue llamado con la función correcta
    expect(mockSetModal).toHaveBeenCalled();

    // Simular la ejecución de la función que recibe setModal
    const updaterFunction = mockSetModal.mock.calls[0][0];
    const prevState = { isOpen: true, message: "", type: "success" };
    const newState = updaterFunction(prevState);
    expect(newState).toEqual({ ...prevState, isOpen: false });

    expect(mockNavigate).toHaveBeenCalledWith("/parents");
  });

  //
  it("[EditarApoderadoForm #17] Debe ejecutar solo setModal sin navegar cuando modal.type NO es success", () => {
    (useEditApoderado as any).mockReturnValue({
      ...defaultHookValue,
      modal: { isOpen: true, message: "Error", type: "error" },
    });

    render(<EditarApoderadoForm />);

    const closeButton = screen.getByRole("button", { name: /entendido/i });
    fireEvent.click(closeButton);

    expect(mockSetModal).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
