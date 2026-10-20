import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ButtonBack } from "./ButtonBack";

vi.mock("lottie-react", async () => {
  const { useEffect } = await import("react");
  return { Lottie: ({ subscriptions }: { subscriptions: { ready: () => void } }) => {
    useEffect(() => subscriptions.ready(), [subscriptions]);
    return <span data-testid="animated-arrow" />;
  } };
});
afterEach(() => vi.unstubAllGlobals());

describe("ButtonBack", () => {
  it("renderiza el boton volver", () => {
    render(
      <MemoryRouter>
        <ButtonBack />
      </MemoryRouter>,
    );

    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("muestra el primer fotograma de inmediato y lo conserva hasta que la animación está lista", async () => {
    let resolveAnimation!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { resolveAnimation = resolve; })));
    const { container } = render(<MemoryRouter><ButtonBack /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Volver" })).toBeEnabled();
    expect(container.querySelector(".button-back__preview")).toBeInTheDocument();
    expect(container.querySelectorAll(".button-back__animation svg")).toHaveLength(1);
    await act(async () => { resolveAnimation({ ok: true, json: async () => ({}) } as Response); });
    expect(await screen.findByTestId("animated-arrow")).toBeInTheDocument();
    expect(container.querySelector(".button-back__preview")).not.toBeInTheDocument();
  });

  it("mantiene una flecha fija si la animación no se puede descargar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { container } = render(<MemoryRouter><ButtonBack /></MemoryRouter>);
    await act(async () => {});
    expect(container.querySelector(".button-back__animation svg")).toBeInTheDocument();
    expect(container.querySelector(".button-back__preview")).toBeInTheDocument();
    expect(screen.queryByTestId("animated-arrow")).not.toBeInTheDocument();
  });
});
