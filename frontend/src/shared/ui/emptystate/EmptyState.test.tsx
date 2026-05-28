import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState Component", () => {
  // Limpia el DOM después de cada test para evitar interferencias
  afterEach(() => {
    cleanup();
  });
  const renderEmptyState = (props = {}) => {
    return render(<EmptyState {...props} />);
  };



  it("[EmptyState #01] Debe renderizar el título por defecto cuando no se recibe la prop title.", () => {
    renderEmptyState();
    const defaultTitle = "No hay datos disponibles";
    expect(screen.getByText(defaultTitle)).toBeInTheDocument();
  });

  it('[EmptyState #02] Debe renderizar el mensaje por defecto cuando no se recibe la prop message.', () => {
    renderEmptyState();
    const defaultMessage = "No se encontraron registros para mostrar.";
    expect(screen.getByText(defaultMessage)).toBeInTheDocument();
  });

  it('[EmptyState #03] No debe renderizar el contenedor del icono si la prop icon es undefined.', () => {
    const { container } = renderEmptyState();
    const iconContainer = container.querySelector(".empty-state__icon");
    expect(iconContainer).not.toBeInTheDocument();
    expect(iconContainer).toBeNull();
  });

  it('[EmptyState #04] No debe renderizar el botón de acción si no se pasan actionText ni onAction.', () => {
    renderEmptyState();
    const actionButton = screen.queryByRole("button");
    expect(actionButton).not.toBeInTheDocument();
  });

  it('[EmptyState #05] Debe mostrar el título personalizado correctamente cuando se recibe la prop title.', () => {
    const customTitle = "Sin resultados de búsqueda";
    renderEmptyState({ title: customTitle });
    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.queryByText("No hay datos disponibles")).not.toBeInTheDocument();
  });

  it('[EmptyState #06] Debe mostrar el mensaje personalizado correctamente cuando se recibe la prop message.', () => {
    const customMessage = "Prueba a ajustar los filtros para encontrar lo que buscas.";
    renderEmptyState({ message: customMessage });
    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.queryByText("No se encontraron registros para mostrar.")).not.toBeInTheDocument();
  });

  it('[EmptyState #07] Debe renderizar el icono dentro del contenedor correspondiente cuando se recibe un elemento React en la prop icon.', () => {
    const TestIcon = <span data-testid="custom-icon">🚀</span>;
    const { container } = renderEmptyState({ icon: TestIcon });
    const iconElement = screen.getByTestId("custom-icon");
    expect(iconElement).toBeInTheDocument();
    const iconContainer = container.querySelector(".empty-state__icon");
    expect(iconContainer).toContainElement(iconElement);
  });

  it('[EmptyState #08] Debe mostrar el botón de acción únicamente si tanto actionText como onAction están presentes.', () => {
    const { rerender } = renderEmptyState({ actionText: "Recargar" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<EmptyState onAction={() => { }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<EmptyState actionText="Recargar" onAction={() => { }} />);
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument();
  });

  it('[EmptyState #09] Debe disparar la función onAction una sola vez cuando el usuario hace clic en el botón.', () => {
    const onActionMock = vi.fn();
    renderEmptyState({
      actionText: "Intentar de nuevo",
      onAction: onActionMock
    });
    const button = screen.getByRole("button", { name: /intentar de nuevo/i });
    fireEvent.click(button);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });

  it('[EmptyState #10] No debe mostrar el botón si solo se recibe actionText pero falta onAction (validación de seguridad visual).', () => {
    renderEmptyState({ actionText: "Botón huérfano" });
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });

});
