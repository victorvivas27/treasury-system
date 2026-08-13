import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo";

describe("BrandLogo", () => {
  it("mantiene el skeleton hasta que el logo termina de cargar", () => {
    const { container } = render(<BrandLogo className="test-logo" />);
    const logo = screen.getByRole("img", { name: "Logo del Sistema de Tesorería" });

    expect(container.querySelector(".brand-logo-skeleton")).toBeInTheDocument();
    expect(container.querySelector(".brand-logo-frame")).not.toHaveClass("is-loaded");

    fireEvent.load(logo);

    expect(container.querySelector(".brand-logo-skeleton")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-logo-frame")).toHaveClass("is-loaded");
  });
});
