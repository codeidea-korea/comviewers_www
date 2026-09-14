import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonLState = "secondary" | "outline" | "primary" | "disabled";

type ButtonLProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  showText?: boolean;
  state?: ButtonLState;
};

export default function ButtonL({
  children = "Text",
  className,
  disabled,
  icon,
  showIcon = true,
  showText = true,
  state = "outline",
  type = "button",
  ...props
}: ButtonLProps) {
  const isDisabled = state === "disabled" || disabled;
  const iconSource = state === "secondary"
    ? "/assets/figma-chevron-dark.svg"
    : isDisabled
      ? "/assets/figma-chevron-disabled.svg"
      : "/assets/figma-chevron-light.svg";

  return (
    <button
      {...props}
      className={["figma-button-l", `figma-button-l--${state}`, className].filter(Boolean).join(" ")}
      disabled={isDisabled}
      type={type}
    >
      {showText && <span className="figma-button-l__text">{children}</span>}
      {showIcon && (icon ?? <img className="figma-button-l__icon" src={iconSource} alt="" />)}
    </button>
  );
}
