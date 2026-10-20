import { PiEyeLight, PiEyeClosedLight } from "react-icons/pi";
import { useId, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiAlertTriangle, FiBox, FiCopy, FiCreditCard, FiDollarSign, FiPercent,
  FiShoppingCart, FiTrendingUp } from "react-icons/fi";
import type { StandPaymentMethod, StandSummary } from "@/core/A-domain/entities/stand/Stand";
import pizzaEquivalentImage from "@/assets/stand/pizza-equivalent-optimized.png";
import "./StandSummaryPanel.css";

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });
const paymentLabels: Record<StandPaymentMethod, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro",
};

const SummaryDisclosure = ({ title, icon: Icon, className = "", children, group }: {
  title: string; icon: IconType; className?: string; children: ReactNode; group: string;
}) => <details className={`stand-summary-disclosure ${className}`} name={group}>
  <summary>
    <h3><i><Icon aria-hidden="true" /></i>{title}</h3>
    <span className="stand-summary-disclosure__show" title="Mostrar datos"><PiEyeClosedLight aria-hidden="true" /></span>
    <span className="stand-summary-disclosure__hide" title="Ocultar datos"><PiEyeLight aria-hidden="true" /></span>
  </summary>
  <div className="stand-summary-disclosure__body">{children}</div>
</details>;

const SummaryBar = ({ value, max }: { value: number; max: number }) =>
  <span className="stand-summary-bar" aria-hidden="true"><i style={{
    width: `${Math.max(4, value / Math.max(max, 1) * 100)}%`,
  }} /></span>;

export const StandSummaryPanel = ({ summary }: { summary: StandSummary }) => {
  const disclosureGroup = useId();
  const maxPayment = Math.max(1, ...Object.values(summary.salesByPaymentMethod));
  const maxProduct = Math.max(1, ...summary.salesByProduct.map(item => item.total));
  const unitsByVariant = summary.salesByProduct.reduce<Record<string, number>>((totals, item) => {
    const variant = item.variant?.trim() || "Sin variante";
    totals[variant] = (totals[variant] ?? 0) + item.units;
    return totals;
  }, {});
  const maxVariantEquivalent = Math.max(1, ...Object.values(summary.equivalentUnitsByVariant ?? {}));
  const maxPresentation = Math.max(1, ...Object.values(summary.unitsByPresentation));
  return <div className="stand-summary">
    <SummaryDisclosure title="Totales del stand" icon={FiDollarSign} group={disclosureGroup}>
    <div className="stand-summary__cards">
      <article className="is-highlight"><div><span>Ganancia neta</span><i><FiTrendingUp /></i></div>
        <strong>{money.format(summary.netProfit)}</strong></article>
      <article className="is-sales"><div><span>Total vendido</span><i><FiDollarSign /></i></div>
        <strong>{money.format(summary.totalSold)}</strong></article>
      <article className="is-cash"><div><span>Efectivo esperado</span><i><FiCreditCard /></i></div>
        <strong>{money.format(summary.expectedCash)}</strong>
        <small>Incluye fondo de {money.format(summary.initialFund)}</small></article>
    </div></SummaryDisclosure>
    <SummaryDisclosure title="Comisiones, costos y cantidades" icon={FiPercent} group={disclosureGroup}>
    <div className="stand-summary__cards stand-summary__cards--secondary">
      <article className="is-commissions"><div><span>Comisión débito</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.debitCommission)}</strong></article>
      <article className="is-commissions"><div><span>Comisión crédito</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.creditCommission)}</strong></article>
      <article className="is-commissions"><div><span>Comisión transferencia</span><i><FiPercent /></i></div>
        <strong>{money.format(summary.transferCommission)}</strong></article>
      <article className="is-commissions"><div><span>Costo de productos</span><i><FiBox /></i></div>
        <strong>{money.format(summary.totalCost)}</strong></article>
      <article className="is-count"><div><span>Ventas</span><i><FiShoppingCart /></i></div>
        <strong>{summary.saleCount}</strong></article>
      <article className="is-units"><div><span>Unidades vendidas</span><i><FiBox /></i></div>
        <strong>{summary.unitsSold}</strong></article>
    </div>
    </SummaryDisclosure>
    <div className="stand-summary__columns">
      <SummaryDisclosure className="is-payment" title="Ventas por medio de pago" icon={FiCreditCard} group={disclosureGroup}>
        {Object.entries(summary.salesByPaymentMethod).map(([method, total]) =>
          <div className="stand-summary-row" key={method}><div>
            <span>{paymentLabels[method as StandPaymentMethod]}</span>
            <strong>{money.format(total)}</strong></div>
            <SummaryBar value={total} max={maxPayment} /></div>)}</SummaryDisclosure>
      <SummaryDisclosure className="is-product" title="Ventas por producto" icon={FiBox} group={disclosureGroup}>
        {summary.salesByProduct.map(item => <div
          className="stand-summary-row" key={`${item.product}-${item.category}-${item.variant}`}>
          <div><span>{item.product}{item.variant ? ` · ${item.variant}` : ""}
            <small>{item.units} unidades · {item.category || "Sin categoría"}</small></span>
          <strong>{money.format(item.profit)}<small>Venta {money.format(item.total)} · Costo {
            money.format(item.cost)}</small></strong></div>
          <SummaryBar value={item.total} max={maxProduct} /></div>)}</SummaryDisclosure>
      <SummaryDisclosure className="is-variant" title="Ventas por variante" icon={FiTrendingUp} group={disclosureGroup}>
        {Object.entries(summary.salesByVariant).map(([variant, total]) =>
          <div className="stand-summary-row stand-summary-variant" key={variant}><div>
            <span className="stand-summary-variant__heading">
              <img src={pizzaEquivalentImage} alt="" aria-hidden="true" />
              <span>
                <strong>{variant}</strong>
                <small>{unitsByVariant[variant] ?? 0} unidades registradas</small>
              </span>
            </span>
            <span className="stand-summary-variant__metrics">
              <span className="stand-summary-variant__metric is-primary">
                <span>
                  <small>Pizzas enteras</small>
                  <strong>{decimal.format(summary.equivalentUnitsByVariant?.[variant] ?? 0)}</strong>
                  <small>equivalentes</small>
                </span>
              </span>
              <span className="stand-summary-variant__metric">
                <small>Total vendido</small>
                <strong>{money.format(total)}</strong>
              </span>
            </span>
            </div><SummaryBar value={summary.equivalentUnitsByVariant?.[variant] ?? 0}
              max={maxVariantEquivalent} /></div>)}
      </SummaryDisclosure>
      <SummaryDisclosure className="is-presentation" title="Unidades por presentación" icon={FiCopy} group={disclosureGroup}>
        {Object.keys(summary.unitsByPresentation).length === 0
          ? <p>Sin presentaciones configuradas.</p>
          : Object.entries(summary.unitsByPresentation).map(([presentation, units]) =>
            <div className="stand-summary-row" key={presentation}><div>
              <span>{presentation}</span><strong>{units}</strong></div>
              <SummaryBar value={units} max={maxPresentation} /></div>)}
      </SummaryDisclosure>
      <SummaryDisclosure className="is-stock" title="Stock por variante" icon={FiAlertTriangle} group={disclosureGroup}>
        {summary.stockAlerts.length === 0 ? <p>No hay productos con stock configurado.</p>
          : summary.stockAlerts.map(item => {
            const initial = item.initialStock ?? item.stock;
            const percentage = initial > 0 ? Math.min(100, (item.stock / initial) * 100) : 0;
            const lowStock = item.stock <= 5;
            return <div className={`stand-summary-stock${lowStock ? " is-low" : ""}`}
              key={item.productId}>
              <div className="stand-summary-stock__heading">
                <span><strong>{item.variant || item.product}</strong>
                  <small>{item.variant ? item.product : "Stock disponible"}</small></span>
                <strong className="stock-alert">{item.soldOut ? "Agotado"
                  : `${decimal.format(item.stock)} disponibles`}</strong>
              </div>
              <span className="stand-summary-stock__bar" aria-hidden="true">
                <i style={{ width: `${percentage}%` }} /></span>
              <small className="stand-summary-stock__detail">Inicial: {decimal.format(initial)} · Vendido: {
                decimal.format(Math.max(0, initial - item.stock))} pizzas equivalentes
                {lowStock && !item.soldOut ? " · Stock bajo" : ""}</small>
            </div>;
          })}</SummaryDisclosure>
    </div>
  </div>;
};

