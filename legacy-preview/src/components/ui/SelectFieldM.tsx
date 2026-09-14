import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type SelectFieldMState = "Default" | "disabled" | "discount";

type SelectFieldMProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  discountText?: ReactNode;
  errorMessage?: ReactNode;
  infoMessage?: ReactNode;
  show?: boolean;
  showError?: boolean;
  showInfo?: boolean;
  showSuccess?: boolean;
  state?: SelectFieldMState;
  successMessage?: ReactNode;
  trailingVisual?: ReactNode;
};

export default function SelectFieldM({
  children = "select",
  className,
  disabled,
  discountText = "- 3,000원",
  errorMessage = "* error",
  infoMessage = "* info",
  show = false,
  showError = true,
  showInfo = true,
  showSuccess = true,
  state = "Default",
  successMessage = "* success",
  trailingVisual,
  type = "button",
  ...props
}: SelectFieldMProps) {
  const isDisabled = state === "disabled" || disabled;

  return (
    <div className={["figma-select-field-m", `figma-select-field-m--${state}`, className].filter(Boolean).join(" ")}>
      <button {...props} disabled={isDisabled} type={type}>
        <span className="figma-select-field-m__value">{children}</span>
        {state === "discount" && <span className="figma-select-field-m__discount">{discountText}</span>}
        {trailingVisual ?? <img className="figma-select-field-m__icon" src={isDisabled ? "/assets/figma-select-chevron-disabled.svg" : "/assets/figma-select-chevron.svg"} alt="" />}
      </button>
      {show && (
        <div className="figma-select-field-m__messages">
          {showInfo && <span className="figma-select-field-m__info">{infoMessage}</span>}
          {showError && <span className="figma-select-field-m__error">{errorMessage}</span>}
          {showSuccess && <span className="figma-select-field-m__success">{successMessage}</span>}
        </div>
      )}
    </div>
  );
}
