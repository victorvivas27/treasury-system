import { useEffect } from "react";

export const useHomeReveal = () => {
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
        const hideAt = isCommunity ? 0.06 : 0.02;
        if (entry.intersectionRatio >= showAt) {
          entry.target.classList.add("is-visible");
        } else if (entry.intersectionRatio <= hideAt) {
          entry.target.classList.remove("is-visible");
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
  }, []);
};
