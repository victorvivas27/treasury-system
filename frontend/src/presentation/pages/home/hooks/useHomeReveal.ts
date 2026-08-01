import { useEffect } from "react";

export const useHomeReveal = () => {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-home-reveal]:not([data-home-card]):not([data-home-scroll-repeat]), "
        + "[data-home-footer-reveal], [data-home-preview-reveal]",
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
        if (entry.intersectionRatio >= 0.25) {
          entry.target.classList.add("is-visible");
        } else if (entry.intersectionRatio <= 0.02) {
          entry.target.classList.remove("is-visible");
        }
      });
    }, { threshold: [0, 0.02, 0.25] });
    repeatableElements.forEach(element => repeatObserver.observe(element));

    return () => {
      revealObserver.disconnect();
      repeatObserver.disconnect();
    };
  }, []);
};
