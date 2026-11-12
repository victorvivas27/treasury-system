import { useEffect } from "react";

export const useHomeReveal = (refreshKey?: unknown) => {
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>(
      '.public-home--member .home-welcome, .public-home--member .home-community > section',
    )];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const homeHeader = document.querySelector<HTMLElement>('.public-home > .public-home__header');
    const firstSection = document.querySelector<HTMLElement>('.public-home--guest .he-hero') ?? sections[0];
    const scrollItems = [...document.querySelectorAll<HTMLElement>(
      '.public-home--editorial .he-hero__copy, .public-home--editorial .he-hero__scroll, '
      + '.public-home--editorial .he-intro > *, .public-home--editorial .he-chapter > div, '
      + '.public-home--editorial .he-possibilities > .he-kicker, .public-home--editorial .he-possibilities > h2, '
      + '.public-home--editorial .he-index > article, .public-home--editorial .he-access__copy, '
      + '.public-home--member .home-community__title-banner, '
      + '.public-home--member .home-community__photo-heading, '
      + '.public-home--member .home-community__board-heading, '
      + '.public-home--member .about-cylinder, '
      + '.public-home--member .home-community__carousel, '
      + '.public-home--member .home-community__photo-placeholder, '
      + '.public-home--member .home-community__board-carousel',
    )];
    const scrollReveal = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-scroll-visible', entry.isIntersecting));
    }, { rootMargin: '-6% 0px -12% 0px', threshold: 0 });
    scrollItems.forEach(item => {
      // Keep initially visible copy in place; animate the following blocks on entry.
      const bounds = item.getBoundingClientRect();
      item.classList.toggle('is-scroll-visible', bounds.top < window.innerHeight * .88 && bounds.bottom > window.innerHeight * .06);
      item.classList.add(item.closest('.public-home--member') ? 'member-scroll-item' : 'home-scroll-item');
      scrollReveal.observe(item);
    });
    let scrollFrame = 0;
    const updateSections = () => {
      scrollFrame = 0;
      const height = window.innerHeight;
      const compact = window.innerWidth <= 680;
      if (homeHeader && firstSection) {
        const headerHeight = homeHeader.offsetHeight;
        const distance = headerHeight - firstSection.getBoundingClientRect().top;
        const progress = motion.matches ? 0 : Math.max(0, Math.min(1, distance / 160));
        const eased = progress * progress * (3 - 2 * progress);
        homeHeader.style.setProperty('--header-offset', `${-headerHeight * eased}px`);
      }
      sections.forEach(section => {
        const bounds = section.getBoundingClientRect();
        // Use viewport distances so long mobile sections remain readable throughout.
        const entering = Math.min(1, Math.max(0, (height * .92 - bounds.top) / (height * .6)));
        const leaving = Math.min(1, Math.max(0, (bounds.bottom - height * .08) / (height * .5)));
        const visibility = motion.matches ? 1 : Math.min(entering, leaving);
        section.style.setProperty('--section-opacity', String(visibility ** 1.5));
        section.style.setProperty('--section-offset', `${motion.matches ? 0 : (1 - visibility) * (bounds.top > height / 2 ? (compact ? 40 : 80) : (compact ? -28 : -56))}px`);
        section.style.setProperty('--section-scale', String(.95 + visibility * .05));
        const progress = Math.max(-1, Math.min(1, (height / 2 - (bounds.top + bounds.height / 2)) / height));
        section.style.setProperty('--scene-y', `${motion.matches ? 0 : progress * (compact ? 18 : 28)}px`);
        section.classList.add('is-scroll-ready');
      });
    };
    const scheduleSections = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateSections);
    };
    updateSections();
    window.addEventListener('scroll', scheduleSections, { passive: true });
    window.addEventListener('resize', scheduleSections);
    motion.addEventListener('change', scheduleSections);
    const sectionResize = new ResizeObserver(scheduleSections);
    sections.forEach(section => sectionResize.observe(section));
    if (firstSection && !sections.includes(firstSection)) sectionResize.observe(firstSection);
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-home-reveal]:not([data-home-scroll-repeat]), "
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
      "[data-home-scroll-repeat]",
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

    return () => {
      window.removeEventListener('scroll', scheduleSections);
      window.removeEventListener('resize', scheduleSections);
      motion.removeEventListener('change', scheduleSections);
      sectionResize.disconnect();
      homeHeader?.style.removeProperty('--header-offset');
      scrollReveal.disconnect();
      scrollItems.forEach(item => item.classList.remove('home-scroll-item', 'member-scroll-item', 'is-scroll-visible'));
      cancelAnimationFrame(scrollFrame);
      sections.forEach(section => {
        section.classList.remove('is-scroll-ready');
        section.style.removeProperty('--section-opacity');
        section.style.removeProperty('--section-offset');
        section.style.removeProperty('--section-scale');
        section.style.removeProperty('--scene-y');
      });
      revealObserver.disconnect();
      repeatObserver.disconnect();
    };
  }, [refreshKey]);
};
