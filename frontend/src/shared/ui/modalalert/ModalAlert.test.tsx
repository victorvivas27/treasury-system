import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModalAlert } from "./ModalAler";
import { act } from "react";


describe("ModalAlert Component", () => {
  beforeEach(() => {
    vi.useFakeTimers(); // Habilitamos timers falsos antes de cada test
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks(); // Restauramos los mocks y timers
    vi.clearAllMocks(); // Asegura limpiar contadores de llamadas
  });

  const defaultProps = {
    isOpen: true,
    message: "Operación exitosa",
    type: "success" as const,
    onClose: vi.fn(),
  };

  // ========== 1. CONTROL DE VISIBILIDAD Y CONTENIDO ==========

  it("[ModalAlert #01] No debe renderizar nada si isOpen es false.", () => {
    const { container } = render(<ModalAlert {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("[ModalAlert #02] Debe renderizar el mensaje y el título de éxito correctamente.", () => {
    render(<ModalAlert {...defaultProps} />);
    expect(screen.getByText("¡Logrado!")).toBeInTheDocument();
    expect(screen.getByText("Operación exitosa")).toBeInTheDocument();
    expect(screen.getByText("✔")).toBeInTheDocument();
  });

  it("[ModalAlert #03] Debe renderizar el título y el icono de error cuando el tipo es error.", () => {
    render(<ModalAlert {...defaultProps} type="error" />);
    expect(screen.getByText("Hubo un error")).toBeInTheDocument();
    expect(screen.getByText("✖")).toBeInTheDocument();
  });

  // ========== 2. INTERACCIONES Y BURBUJEO ==========

  it("[ModalAlert #04] Debe llamar a onClose al hacer clic en el botón 'Entendido'.", () => {
    render(<ModalAlert {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /entendido/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("[ModalAlert #05] Debe llamar a onClose al hacer clic en el overlay.", () => {
    render(<ModalAlert {...defaultProps} />);
    // El aside tiene el role dialog y es el overlay
    fireEvent.click(screen.getByRole("dialog"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("[ModalAlert #06] No debe llamar a onClose al hacer clic dentro del modal (stopPropagation).", () => {
    render(<ModalAlert {...defaultProps} />);
    const modalContainer = screen.getByText("¡Logrado!").closest("article");

    if (modalContainer) {
      fireEvent.click(modalContainer);
    }

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  // ========== 3. LÓGICA DE AUTOCIERRE (TIMERS) ==========

  it("[ModalAlert #07] Debe cerrar el modal automáticamente tras el autoCloseTime.", () => {
    const autoCloseTime = 3000;
    render(<ModalAlert {...defaultProps} autoCloseTime={autoCloseTime} />);

    // Adelantamos el tiempo 3 segundos
    act(() => {
      vi.advanceTimersByTime(autoCloseTime);
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("[ModalAlert #08] Debe mostrar la barra de progreso solo si existe autoCloseTime.", () => {
    const { container, rerender } = render(<ModalAlert {...defaultProps} />);
    expect(container.querySelector(".modal-progress")).not.toBeInTheDocument();

    rerender(<ModalAlert {...defaultProps} autoCloseTime={5000} />);
    expect(container.querySelector(".modal-progress")).toBeInTheDocument();
  });

  // ========== 4. ACCESIBILIDAD ==========

  it("[ModalAlert #09] Debe cumplir con las propiedades de accesibilidad dialog y aria-modal.", () => {
    render(<ModalAlert {...defaultProps} />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
  });
});
