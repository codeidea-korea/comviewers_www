import { type ButtonHTMLAttributes, type ReactNode } from "react";

type SelectButtonSProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  focus?: boolean;
};

export default function SelectButtonS({ children = "Text", className, focus = false, type = "button", ...props }: SelectButtonSProps) {
  return <button {...props} aria-pressed={focus} className={["figma-select-button-s", focus && "figma-select-button-s--focus", className].filter(Boolean).join(" ")} type={type}>{children}</button>;
}
