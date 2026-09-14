import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonMState = "off" | "on" | "disable" | "stroke";

type ButtonMProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  showTooltip?: boolean;
  state?: ButtonMState;
};

export default function ButtonM({
  children = "Text",
  className,
  disabled,
  showTooltip = true,
  state = "on",
  type = "button",
  ...props
}: ButtonMProps) {
  const isDisabled = state === "disable" || disabled;

  return (
    <span className="figma-button-m-wrap">
      <button
        {...props}
        className={["figma-button-m", `figma-button-m--${state}`, className].filter(Boolean).join(" ")}
        disabled={isDisabled}
        type={type}
      >
        {children}
      </button>
      {state === "stroke" && showTooltip && (
        <span className="figma-button-m__tooltip" role="tooltip">
          <span className="figma-button-m__tooltip-icon" aria-hidden="true" />
          <span>{children}</span>
        </span>
      )}
    </span>
  );
}
