import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const sequence: (number | null)[] = [null, null, 0, 1, 2, 3, 4];

export function usePreviewDemo(setActivePanel: Dispatch<SetStateAction<number | null>>) {
  const viewport = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!window.matchMedia || typeof IntersectionObserver === "undefined") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEligible(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.intersectionRatio >= .25 && !document.hidden);
    }, { threshold: [0, .25] });
    const node = viewport.current;
    if (node) observer.observe(node);
    const onVisibility = () => {
      if (document.hidden) setVisible(false);
      else if (node) { observer.unobserve(node); observer.observe(node); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  const running = eligible && visible;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setStep(current => (current + 1) % sequence.length), 3200);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!running) return;
    const panel = sequence[step];
    setActivePanel(panel);
    const timer = window.setTimeout(() => {
      const node = viewport.current;
      if (!node) return;
      const target = panel === null ? null : node.querySelector<HTMLElement>(`#preview-panel-${panel}`)?.parentElement;
      const top = target ? target.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop - 12 : 0;
      // Scroll only the simulated screen, never the home page.
      node.scrollTo({ top, behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [step, running, setActivePanel]);
  return { viewport, eligible, step };
}
