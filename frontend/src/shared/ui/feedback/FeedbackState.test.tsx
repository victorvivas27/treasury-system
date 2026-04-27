import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackState } from "./FeedbackState";


describe("FeedbackState Component", () => {
  afterEach(() => {
    cleanup();
  });

  // Helper para aplicar DRY.
  // Message es obligatorio, por eso lo incluimos por defecto.
  const renderFeedbackState = (props: any = {}) => {
    const defaultProps = { message: "Mensaje de prueba" };
    return render(<FeedbackState {...defaultProps} {...props} />);
  };

  // ========== 1. RENDERIZADO DE CONTENIDO ==========

  it('[FeedbackState #01] Debe renderizar el título por defecto ("Hubo un problema") cuando no se proporciona la prop title.', () => {
    renderFeedbackState();
    expect(screen.getByText("Hubo un problema")).toBeInTheDocument();
  });

  it('[FeedbackState #02] Debe renderizar el mensaje obligatorio correctamente.', () => {
    const text = "Error específico del servidor";
    renderFeedbackState({ message: text });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('[FeedbackState #03] Debe mostrar un título personalizado cuando se recibe la prop title.', () => {
    renderFeedbackState({ title: "Acceso denegado" });
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  // ========== 2. VARIANTES DE ESTADO (TYPE) ==========

  it('[FeedbackState #04] Debe aplicar la clase CSS por defecto (feedback-state--error) cuando no se proporciona la prop type.', () => {
    const { container } = renderFeedbackState();
    const section = container.firstChild;
    expect(section).toHaveClass("feedback-state--error");
  });

  it('[FeedbackState #05] Debe aplicar la clase correcta según el tipo recibido.', () => {
    const { container, rerender } = renderFeedbackState({ type: "warning" });
    expect(container.firstChild).toHaveClass("feedback-state--warning");

    rerender(<FeedbackState message="Test" type="info" />);
    expect(container.firstChild).toHaveClass("feedback-state--info");
  });

  // ========== 3. INTERACCIÓN Y COMPONENTE BUTTON ==========

  it('[FeedbackState #06] No debe renderizar el botón de reintento si no se proporciona la función onRefresh.', () => {
    renderFeedbackState({ onRefresh: undefined });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it('[FeedbackState #07] Debe renderizar el componente Button con el label "Intentar de nuevo" cuando existe onRefresh.', () => {
    renderFeedbackState({ onRefresh: () => {} });
    expect(screen.getByRole("button", { name: /intentar de nuevo/i })).toBeInTheDocument();
  });

  it('[FeedbackState #08] Debe disparar la función onRefresh al hacer clic en el botón.', () => {
    const onRefreshMock = vi.fn();
    renderFeedbackState({ onRefresh: onRefreshMock });

    const button = screen.getByRole("button", { name: /intentar de nuevo/i });
    fireEvent.click(button);

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });

  // ========== 4. ESTRUCTURA Y SEMÁNTICA ==========

  it('[FeedbackState #09] Debe utilizar la etiqueta semántica <section> como contenedor principal.', () => {
    const { container } = renderFeedbackState();
    expect(container.firstChild?.nodeName).toBe("SECTION");
    expect(container.firstChild).toHaveClass("feedback-state");
  });

  it('[FeedbackState #10] El título debe utilizar una etiqueta <h2> para mantener la jerarquía.', () => {
    renderFeedbackState({ title: "Título de prueba" });
    const titleElement = screen.getByText("Título de prueba");
    expect(titleElement.tagName).toBe("H2");
    expect(titleElement).toHaveClass("feedback-state__title");
  });
});
