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

    // Buscamos por la clase CSS que envuelve al icono
    const iconContainer = container.querySelector(".empty-state__icon");

    expect(iconContainer).not.toBeInTheDocument();
    expect(iconContainer).toBeNull();
  });

  it('[EmptyState #04] No debe renderizar el botón de acción si no se pasan actionText ni onAction.', () => {
    renderEmptyState();

    // queryByRole devuelve null si no lo encuentra, en lugar de fallar el test.
    const actionButton = screen.queryByRole("button");

    expect(actionButton).not.toBeInTheDocument();
  });

  it('[EmptyState #05] Debe mostrar el título personalizado correctamente cuando se recibe la prop title.', () => {
    const customTitle = "Sin resultados de búsqueda";
    renderEmptyState({ title: customTitle });

    expect(screen.getByText(customTitle)).toBeInTheDocument();
    // Opcional: Verificar que NO esté el título por defecto
    expect(screen.queryByText("No hay datos disponibles")).not.toBeInTheDocument();
  });

  it('[EmptyState #06] Debe mostrar el mensaje personalizado correctamente cuando se recibe la prop message.', () => {
    const customMessage = "Prueba a ajustar los filtros para encontrar lo que buscas.";
    renderEmptyState({ message: customMessage });

    expect(screen.getByText(customMessage)).toBeInTheDocument();
    // Verificamos que el mensaje por defecto haya sido reemplazado
    expect(screen.queryByText("No se encontraron registros para mostrar.")).not.toBeInTheDocument();
  });

  it('[EmptyState #07] Debe renderizar el icono dentro del contenedor correspondiente cuando se recibe un elemento React en la prop icon.', () => {
    const TestIcon = <span data-testid="custom-icon">🚀</span>;
    const { container } = renderEmptyState({ icon: TestIcon });

    // 1. Verificamos que el icono específico esté en el documento
    const iconElement = screen.getByTestId("custom-icon");
    expect(iconElement).toBeInTheDocument();

    // 2. Verificamos que esté envuelto en el contenedor con la clase correcta
    const iconContainer = container.querySelector(".empty-state__icon");
    expect(iconContainer).toContainElement(iconElement);
  });

it('[EmptyState #08] Debe mostrar el botón de acción únicamente si tanto actionText como onAction están presentes.', () => {
    const { rerender } = renderEmptyState({ actionText: "Recargar" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<EmptyState onAction={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<EmptyState actionText="Recargar" onAction={() => {}} />);
    // Esto sigue funcionando porque el Button interno renderiza un botón con ese nombre
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument();
  });

it('[EmptyState #09] Debe disparar la función onAction una sola vez cuando el usuario hace clic en el botón.', () => {
    const onActionMock = vi.fn();
    renderEmptyState({
      actionText: "Intentar de nuevo",
      onAction: onActionMock
    });

    // Tu componente Button genera un botón, así que getByRole sigue siendo el estándar de oro
    const button = screen.getByRole("button", { name: /intentar de nuevo/i });
    fireEvent.click(button);

    expect(onActionMock).toHaveBeenCalledTimes(1);
  });

  it('[EmptyState #10] No debe mostrar el botón si solo se recibe actionText pero falta onAction (validación de seguridad visual).', () => {
    // Solo pasamos el texto, omitimos onAction intencionalmente
    renderEmptyState({ actionText: "Botón huérfano" });

    const button = screen.queryByRole("button");

    // El botón no debe existir en el DOM
    expect(button).not.toBeInTheDocument();
  });

 it('[EmptyState #11] Debe utilizar la etiqueta semántica <section> como contenedor principal con la clase CSS empty-state.', () => {
    const { container } = renderEmptyState();

    // IMPORTANTE: container.firstChild suele ser el elemento raíz.
    // Si hay espacios en blanco en el JSX, a veces puede pillar un nodo de texto.
    // Usar container.querySelector('section') es más robusto si la estructura crece.
    const rootElement = container.querySelector("section");

    expect(rootElement?.tagName).toBe("SECTION");
    expect(rootElement).toHaveClass("empty-state");
  });

  it('[EmptyState #12] Debe renderizar el título con una etiqueta <h3> para mantener la consistencia en la jerarquía de encabezados.', () => {
    const customTitle = "Título Jerárquico";
    renderEmptyState({ title: customTitle });

    const titleElement = screen.getByText(customTitle);

    expect(titleElement.tagName).toBe("H3");
    expect(titleElement).toHaveClass("empty-state__title");
  });

  // TEST NUEVO PARA EL CAMBIO QUE HICISTE:
  it('[EmptyState #13] Debe envolver el botón en un contenedor con la clase empty-state__actions.', () => {
    renderEmptyState({ actionText: "Acción", onAction: () => {} });

    const button = screen.getByRole("button");
    // Verificamos que el padre del botón (o el abuelo, dependiendo de la estructura interna de tu <Button>)
    // sea el div con la clase que agregaste.
    expect(button.closest('.empty-state__actions')).toBeInTheDocument();
  });

});
