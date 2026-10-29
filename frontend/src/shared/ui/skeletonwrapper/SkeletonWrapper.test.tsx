import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";

describe("SkeletonWrapper", () => {

  it("adapta la altura al texto y oculta el contenido pendiente", () => {
    render(
      <SkeletonWrapper isLoading={true}>
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".data-skeleton");
    expect(skeleton).toContainElement(document.querySelector(".react-loading-skeleton"));
    expect((skeleton as HTMLElement).style.height).toBe("");
    expect(screen.queryByText("Child")).not.toBeInTheDocument();
  });


  it("respeta dimensiones relativas y muestra el contenido al terminar", () => {
    const page = render(
      <SkeletonWrapper isLoading={true} width="60%" height="2em">
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".data-skeleton");
    expect((skeleton as HTMLElement).style.width).toBe("60%");
    expect((skeleton as HTMLElement).style.height).toBe("2em");
    page.rerender(<SkeletonWrapper isLoading={false}><div>Child</div></SkeletonWrapper>);
    expect(screen.getByText("Child")).toBeVisible();
    expect(document.querySelector(".react-loading-skeleton")).not.toBeInTheDocument();
  });
});
