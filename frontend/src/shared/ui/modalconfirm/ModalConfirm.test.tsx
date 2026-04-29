import { render, screen, fireEvent } from "@testing-library/react";
import { ModalConfirm } from "./ModalConfirm";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockProps = {
  isOpen: true,
  message: "¿Está seguro de eliminar este registro?",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ModalConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("[ModalConfirm #01] debe no renderizar nada cuando isOpen es false", () => {
    const { container } = render(<ModalConfirm {...mockProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  test("[ModalConfirm #02] debe mostrar el título, mensaje y etiquetas de botones por defecto", () => {
    render(<ModalConfirm {...mockProps} />);
    expect(screen.getByText("Confirmar acción")).toBeInTheDocument();
    expect(screen.getByText(mockProps.message)).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  test("[ModalConfirm #03] debe ejecutar onCancel al hacer clic en el botón de cancelar o en el overlay", () => {
    render(<ModalConfirm {...mockProps} />);

    // Click en botón cancelar
    fireEvent.click(screen.getByText("Cancelar"));
    // Click en overlay (el aside es el role dialog)
    fireEvent.click(screen.getByRole("dialog"));

    expect(mockProps.onCancel).toHaveBeenCalledTimes(2);
  });

  test("[ModalConfirm #04] debe ejecutar onConfirm al hacer clic en el botón de confirmar", () => {
    render(<ModalConfirm {...mockProps} />);
    fireEvent.click(screen.getByText("Confirmar"));
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  test("[ModalConfirm #05] debe evitar el cierre del modal (propagación del click) al interactuar con el contenedor interno", () => {
    render(<ModalConfirm {...mockProps} />);
    const articleContainer = screen.getByRole("article");

    fireEvent.click(articleContainer);

    expect(mockProps.onCancel).not.toHaveBeenCalled();
  });

  test("[ModalConfirm #06] debe mostrar el texto 'Procesando...' cuando isLoading es true", () => {
    render(<ModalConfirm {...mockProps} isLoading={true} />);
    expect(screen.getByText("Procesando...")).toBeInTheDocument();
    expect(screen.queryByText("Confirmar")).not.toBeInTheDocument();
  });

  test("[ModalConfirm #07] debe aplicar correctamente los atributos de accesibilidad role='dialog' y aria-modal='true'", () => {
    render(<ModalConfirm {...mockProps} />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");
  });
});
