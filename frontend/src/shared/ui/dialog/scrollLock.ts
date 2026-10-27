// All overlays share ownership so closing one cannot unlock or strand another.
const locks = new Set<symbol>();
let originalOverflow = "";

export function lockBodyScroll(): () => void {
  const owner = Symbol("scroll-lock");
  if (!locks.size) originalOverflow = document.body.style.overflow;
  locks.add(owner);
  document.body.style.overflow = "hidden";
  return () => {
    if (!locks.delete(owner)) return;
    document.body.style.overflow = locks.size ? "hidden" : originalOverflow;
  };
}
