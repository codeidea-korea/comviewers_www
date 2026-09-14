import { type InputHTMLAttributes, type ReactNode } from "react";

export type FigmaInputState = "Default" | "filled" | "disabled";

type FigmaInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  errorMessage?: ReactNode;
  icon?: ReactNode;
  infoMessage?: ReactNode;
  show?: boolean;
  showError?: boolean;
  showIcon?: boolean;
  showInfo?: boolean;
  showSuccess?: boolean;
  state?: FigmaInputState;
  successMessage?: ReactNode;
};

export default function FigmaInput({
  className,
  disabled,
  errorMessage = "* error",
  icon,
  infoMessage = "* info",
  show = true,
  showError = false,
  showIcon = true,
  showInfo = true,
  showSuccess = false,
  state = "Default",
  successMessage = "* success",
  ...props
}: FigmaInputProps) {
  const isDisabled = state === "disabled" || disabled;
  const hasFilledValue = state === "filled";

  return (
    <div className={["figma-input", `figma-input--${state}`, className].filter(Boolean).join(" ")}>
      <div className="figma-input__control">
        <input {...props} aria-invalid={showError || undefined} disabled={isDisabled} />
        {showIcon && (icon ?? <img className="figma-input__icon" src={isDisabled ? "/assets/figma-eye-disabled.svg" : "/assets/figma-eye.svg"} alt="" />)}
      </div>
      {show && (
        <div className="figma-input__messages">
          {showInfo && <span className="figma-input__info">{infoMessage}</span>}
          {hasFilledValue && showError && <span className="figma-input__error">{errorMessage}</span>}
          {hasFilledValue && showSuccess && <span className="figma-input__success">{successMessage}</span>}
        </div>
      )}
    </div>
  );
}
