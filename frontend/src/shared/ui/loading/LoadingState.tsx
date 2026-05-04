import "./LoadingState.css";
import { GiTakeMyMoney } from "react-icons/gi";
import { FcMoneyTransfer } from "react-icons/fc";
import { LiaPiggyBankSolid } from "react-icons/lia";
import { BsBank } from "react-icons/bs";
import type { FC } from "react";
interface LoadingStateProps {
  mesage?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({ mesage = "Cargando..." }) => {
  const charCount = mesage.length;
  return (
    <section className="loading-state">
      <div className="animated-icons">
        <span className="icon icon-money"><GiTakeMyMoney /></span>
        <span className="icon icon-transfer"><FcMoneyTransfer /></span>
        <span className="icon icon-piggy"><LiaPiggyBankSolid /></span>
        <span className="icon icon-banck"><BsBank /></span>
        <div
          className="rotating-text"
          style={{ "--chars": charCount } as React.CSSProperties}
        >
          <p className="rotating-text__text">{mesage}</p>
        </div>
      </div>
    </section>
  );
};
