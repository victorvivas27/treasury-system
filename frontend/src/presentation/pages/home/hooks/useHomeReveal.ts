import { useEffect } from "react";

export const useHomeReveal = (refreshKey?: unknown) => {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-home-reveal]:not([data-home-card]):not([data-home-scroll-repeat]), "
        + "[data-home-footer-reveal]",
    );
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });
    elements.forEach(element => revealObserver.observe(element));

    const repeatableElements = document.querySelectorAll<HTMLElement>(
      "[data-home-card], [data-home-scroll-repeat]",
    );
    const repeatObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const isCommunity = entry.target.hasAttribute("data-home-community-repeat");
        const showAt = isCommunity ? 0.14 : 0.25;
        // Long community sections can exceed the viewport and never reach 14%.
        if (entry.intersectionRatio >= showAt || (isCommunity && entry.isIntersecting)) {
          entry.target.classList.add("is-visible");
          repeatObserver.unobserve(entry.target);
        }
      });
    }, { threshold: [0, 0.02, 0.06, 0.14, 0.25] });
    repeatableElements.forEach(element => repeatObserver.observe(element));

    const preview = document.querySelector<HTMLElement>("[data-home-preview-reveal]");
    const previewObserver = new IntersectionObserver(([entry]) => {
      entry.target.classList.toggle("is-visible", entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25] });
    if (preview) previewObserver.observe(preview);

    return () => {
      revealObserver.disconnect();
      repeatObserver.disconnect();
      previewObserver.disconnect();
    };
  }, [refreshKey]);
};
