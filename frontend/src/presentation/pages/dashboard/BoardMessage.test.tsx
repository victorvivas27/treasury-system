import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardMessage } from "./BoardMessage";

const content = { heading: "De parte de la directiva", title: "Gracias por hacer equipo.",
  message: "Frase guardada", signature: "Con cariño,\nLa directiva del curso" };

const { getBoardMessage, saveBoardMessage } = vi.hoisted(() => ({
  getBoardMessage: vi.fn(), saveBoardMessage: vi.fn(),
}));
vi.mock("@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl", () => ({
  TreasuryRepositoryImpl: vi.fn().mockImplementation(function () {
    return { getBoardMessage, saveBoardMessage };
  }),
}));

describe("BoardMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBoardMessage.mockResolvedValue(content);
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  });

  it("muestra la frase guardada sin edición para usuarios", async () => {
    render(<BoardMessage />);
    expect(await screen.findByText("Frase guardada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar mensaje" })).not.toBeInTheDocument();
  });

  it("permite guardar y muestra la respuesta persistida", async () => {
    saveBoardMessage.mockResolvedValue({ ...content, message: "Nueva frase" });
    render(<BoardMessage isAdmin />);
    await screen.findByText("Frase guardada");
    fireEvent.click(screen.getByRole("button", { name: "Editar mensaje" }));
    fireEvent.change(screen.getByLabelText("Frase"), { target: { value: " Nueva frase " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(saveBoardMessage).toHaveBeenCalledWith({ ...content, message: "Nueva frase" }));
    expect(await screen.findByText("Nueva frase", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edita los cuatro bloques en el orden de la tarjeta", async () => {
    const updated = { heading: "Nuestra comunidad", title: "Juntos podemos",
      message: "Gracias por participar", signature: "Un abrazo,\nEquipo del curso" };
    saveBoardMessage.mockResolvedValue(updated);
    render(<BoardMessage isAdmin />);
    await screen.findByText("Frase guardada");
    fireEvent.click(screen.getByRole("button", { name: "Editar mensaje" }));
    expect(screen.getAllByRole("textbox").map(element => element.id)).toEqual([
      "board-message-heading", "board-message-title", "board-message-message", "board-message-signature",
    ]);
    for (const [label, value] of [["Encabezado", updated.heading], ["Título", updated.title],
      ["Frase", updated.message], ["Firma", updated.signature]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(saveBoardMessage).toHaveBeenCalledWith(updated));
    expect(await screen.findByRole("heading", { name: updated.title })).toBeInTheDocument();
    expect(screen.getByText(updated.heading, { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Equipo del curso", { selector: "strong" })).toBeInTheDocument();
  });

  it("cancela sin guardar y rechaza una frase vacía", async () => {
    render(<BoardMessage isAdmin />);
    await screen.findByText("Frase guardada");
    fireEvent.click(screen.getByRole("button", { name: "Editar mensaje" }));
    fireEvent.change(screen.getByLabelText("Frase"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(saveBoardMessage).not.toHaveBeenCalled();
    expect(screen.getByText("Frase guardada")).toBeInTheDocument();
  });

  it("conserva el borrador y la frase anterior si falla el guardado", async () => {
    saveBoardMessage.mockRejectedValue(new Error("offline"));
    render(<BoardMessage isAdmin />);
    await screen.findByText("Frase guardada");
    fireEvent.click(screen.getByRole("button", { name: "Editar mensaje" }));
    fireEvent.change(screen.getByLabelText("Frase"), { target: { value: "Borrador" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(screen.getByLabelText("Frase")).toHaveValue("Borrador");
    expect(screen.getByText("Frase guardada")).toBeInTheDocument();
  });
});
