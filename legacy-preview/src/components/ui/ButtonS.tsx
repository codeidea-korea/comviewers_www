import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonSState = "off" | "on" | "disable";

type ButtonSProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  state?: ButtonSState;
};

export default function ButtonS({ children = "Text", className, disabled, state = "on", type = "button", ...props }: ButtonSProps) {
  const isDisabled = state === "disable" || disabled;

  return <button {...props} className={["figma-button-s", `figma-button-s--${state}`, className].filter(Boolean).join(" ")} disabled={isDisabled} type={type}>{children}</button>;
}
