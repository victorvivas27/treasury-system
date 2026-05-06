// __tests__/shared/ui/skeletonwrapper/SkeletonWrapper.test.tsx
import { render} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkeletonWrapper } from "@/shared/ui/skeletonwrapper/SkeletonWrapper";

describe("SkeletonWrapper", () => {
  //  Debe usar height: 'var(--md)' como valor por defecto cuando no se proporciona height
  it("[SkeletonWrapper #01]Debe usar height: 'var(--md)' como valor por defecto cuando no se proporciona height", () => {
    render(
      <SkeletonWrapper isLoading={true}>
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".skeleton-block");
    expect(skeleton).toHaveStyle("height: var(--md)");
  });

  // [ SkeletonWrapper #02 ] Debe usar width: 'var(--wh-100)' como valor por defecto cuando no se proporciona width
  it("[SkeletonWrapper #02]Debe usar width: 'var(--wh-100)' como valor por defecto cuando no se proporciona width", () => {
    render(
      <SkeletonWrapper isLoading={true}>
        <div>Child</div>
      </SkeletonWrapper>
    );

    const skeleton = document.querySelector(".skeleton-block");
    expect(skeleton).toHaveStyle("width: var(--wh-100)");
  });
});
