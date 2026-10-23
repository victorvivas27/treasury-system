import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export type CashflowDetailAnchor = {
  top: number; left: number; right: number;
  chartTop: number; chartBottom: number; chartLeft: number; chartRight: number;
};

export type CashflowMonthDetail = {
  name: string; income: number; expense: number;
  incomes: [string, number][]; expenses: [string, number][];
};
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function CashflowMonthPopover({ month, year, onClose, anchor }: {
  month: CashflowMonthDetail; year: number; onClose: () => void; anchor?: CashflowDetailAnchor;
}) {
  const ref = useRef<HTMLElement>(null);
  const cord = useRef<SVGPathElement>(null);
  const cordStart = useRef<SVGCircleElement>(null);
  const cordEnd = useRef<SVGCircleElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>("article");
    if (!panel || !anchor) return;
    const position = () => {
      const visible = window.visualViewport;
      const viewLeft = visible?.offsetLeft ?? 0;
      const viewTop = visible?.offsetTop ?? 0;
      const viewWidth = visible?.width ?? window.innerWidth;
      const viewHeight = visible?.height ?? window.innerHeight;
      const viewRight = viewLeft + viewWidth;
      const viewBottom = viewTop + viewHeight;
      const gutter = 12;
      const gap = 8;
      const width = panel.offsetWidth;
      const above = anchor.chartTop - gap - gutter;
      const below = window.innerHeight - anchor.chartBottom - gap - gutter;
      const fitsRight = anchor.chartRight + gap + width <= window.innerWidth - gutter;
      const fitsLeft = anchor.chartLeft - gap - width >= gutter;
      const preferredRight = anchor.right + gap;
      const preferredLeft = anchor.left - gap - width;
      let left = preferredRight + width <= window.innerWidth - gutter ? preferredRight : preferredLeft;
      let top: number;
      if (window.innerWidth <= 680) {
        const margin = 20;
        panel.style.maxHeight = `${Math.min(220, viewHeight - 2 * margin)}px`;
        left = Math.max(viewLeft + margin, Math.min(anchor.left, viewRight - width - margin));
        const aboveMonth = anchor.top - gap - panel.offsetHeight;
        const belowMonth = anchor.top + 40;
        top = aboveMonth >= viewTop + margin ? aboveMonth : belowMonth;
        top = Math.max(viewTop + margin, Math.min(top, viewBottom - panel.offsetHeight - margin));
      } else if (above >= 140) {
        panel.style.maxHeight = `${Math.min(280, above)}px`;
        top = anchor.chartTop - gap - panel.offsetHeight;
      } else if (fitsRight || fitsLeft) {
        panel.style.maxHeight = `${Math.min(280, window.innerHeight - 2 * gutter)}px`;
        left = fitsRight ? anchor.chartRight + gap : anchor.chartLeft - gap - width;
        top = anchor.top - panel.offsetHeight;
      } else if (below >= 140) {
        panel.style.maxHeight = `${Math.min(280, below)}px`;
        top = anchor.chartBottom + gap;
      } else {
        // In very short windows, keep the month bar free and scroll the details internally.
        const space = Math.max(140, anchor.top - gap - gutter);
        panel.style.maxHeight = `${Math.min(280, space, window.innerHeight - 2 * gutter)}px`;
        top = anchor.top - gap - panel.offsetHeight;
      }
      left = Math.max(viewLeft + gutter, Math.min(left, viewRight - width - gutter));
      top = Math.max(viewTop + gutter, Math.min(top, viewBottom - panel.offsetHeight - gutter));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      const startX = (anchor.left + anchor.right) / 2;
      const startY = anchor.top;
      const endX = Math.max(left + 12, Math.min(startX, left + width - 12));
      const endY = top + panel.offsetHeight <= startY ? top + panel.offsetHeight : top;
      const bend = Math.max(16, Math.abs(startY - endY) / 2);
      const direction = endY <= startY ? -1 : 1;
      cord.current?.setAttribute("d", `M ${startX} ${startY} C ${startX} ${startY + bend * direction}, ${endX} ${endY - bend * direction}, ${endX} ${endY}`);
      cordStart.current?.setAttribute("cx", String(startX));
      cordStart.current?.setAttribute("cy", String(startY));
      cordEnd.current?.setAttribute("cx", String(endX));
      cordEnd.current?.setAttribute("cy", String(endY));
    };
    position();
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(position);
    observer?.observe(panel);
    return () => { window.removeEventListener("resize", position); window.visualViewport?.removeEventListener("resize", position); observer?.disconnect(); };
  }, [anchor]);
  useEffect(() => {
    const panel = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const openedAt = performance.now();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel?.contains(event.target)) closeRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
    };
    const scroll = (event: Event) => {
      if (performance.now() - openedAt > 300 && event.target instanceof Node && !panel?.contains(event.target)) closeRef.current();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", scroll, true);
      if (previous?.isConnected && (panel?.contains(document.activeElement) || document.activeElement === document.body)) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<aside className="cashflow-detail-popover" role="dialog"
    aria-label={`${month.name} de ${year}`} ref={ref} tabIndex={-1}>
    <svg className="cashflow-detail-cord" aria-hidden="true">
      <path ref={cord} pathLength="1" />
      <circle ref={cordStart} r="2.5" />
      <circle ref={cordEnd} r="2.5" />
    </svg>
    <article className="cashflow-detail">
      <header><small>Movimientos</small>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle mensual"><FiX aria-hidden="true" /></button></header>
      <div className="cashflow-detail__body">
        {([{ title: "Ingresos", total: month.income, groups: month.incomes, tone: "income" },
          { title: "Egresos", total: month.expense, groups: month.expenses, tone: "expense" }] as const).map(group =>
          <section key={group.title} className={`cashflow-detail__group cashflow-detail__group--${group.tone}`}>
            <h3>{group.title}<strong>{money.format(group.total)}</strong></h3>
            {group.groups.length ? <dl>{group.groups.map(([concept, amount]) =>
              <div key={concept}><dt>{concept}</dt><dd>{money.format(amount)}</dd></div>)}</dl> : <p>Sin {group.title.toLowerCase()}</p>}
          </section>)}
      </div>
      <footer><span>Balance del mes</span><strong className={month.income < month.expense ? "is-negative" : "is-positive"}>{money.format(month.income - month.expense)}</strong></footer>
    </article>
  </aside>, document.body);
}
