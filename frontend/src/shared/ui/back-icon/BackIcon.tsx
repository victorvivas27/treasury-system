import { cloneElement, type ReactElement } from "react";
import type { IconBaseProps } from "react-icons";
import { IoChevronBack } from "react-icons/io5";
import "./BackIcon.css";

export const BackIcon = ({ desktopIcon, ...props }: IconBaseProps & { desktopIcon?: ReactElement<IconBaseProps> }) => <>
  {desktopIcon && cloneElement(desktopIcon, { className: `${desktopIcon.props.className ?? ""} back-icon__desktop`.trim() })}
  <IoChevronBack {...props} className={`${props.className ?? ""} back-icon__chevron ${desktopIcon ? "back-icon__mobile" : ""}`.trim()} aria-hidden="true" />
</>;
