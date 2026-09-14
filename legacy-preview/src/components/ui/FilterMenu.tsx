import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { SelectBoxS } from "./SelectBox";

type FilterMenuProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  changeIcon?: boolean;
  number?: ReactNode;
  showNumber?: boolean;
};

export default function FilterMenu({ children = "menu", changeIcon = false, className, number = "1", showNumber = true, type = "button", ...props }: FilterMenuProps) {
  return (
    <button {...props} className={["figma-filter-menu", className].filter(Boolean).join(" ")} type={type}>
      <span className="figma-filter-menu__title"><SelectBoxS /><span>{children}</span>{showNumber && <span className="figma-filter-menu__number">{number}</span>}</span>
      <img className="figma-filter-menu__icon" src={changeIcon ? "/assets/figma-filter-chevron-down.svg" : "/assets/figma-filter-chevron-up.svg"} alt="" />
    </button>
  );
}
