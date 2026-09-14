import { type ButtonHTMLAttributes, type ReactNode } from "react";

type TabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  number?: ReactNode;
  showNumber?: boolean;
  state?: boolean;
};

export default function Tab({ children = "Text", className, number = "1", showNumber = true, state = false, type = "button", ...props }: TabProps) {
  return (
    <button {...props} aria-selected={state} className={["figma-tab", state ? "figma-tab--on" : "figma-tab--off", className].filter(Boolean).join(" ")} role="tab" type={type}>
      <span>{children}</span>
      {showNumber && <span className="figma-tab__number">{number}</span>}
    </button>
  );
}
