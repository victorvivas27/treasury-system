import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";

describe("SkeletonWrapper", () => {

  it("[SkeletonWrapper #01]Debe usar height: '1rem' como valor por defecto cuando no se proporciona height", () => {
    render(
      <SkeletonWrapper isLoading={true}>
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".skeleton-block");
    // Verifica que el valor siga siendo relativo; jsdom lo calcula como 16px.
    expect((skeleton as HTMLElement).style.height).toBe("1rem");
  });


  it("[SkeletonWrapper #02]Debe usar width: '100%' como valor por defecto cuando no se proporciona width", () => {
    render(
      <SkeletonWrapper isLoading={true}>
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".skeleton-block");
    expect(skeleton).toHaveStyle("width: 100%");
  });
});
