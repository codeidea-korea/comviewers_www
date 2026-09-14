import { type ReactNode, type TextareaHTMLAttributes } from "react";

export type InputBoxState = "off" | "on" | "filled";

type InputBoxProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> & {
  action?: ReactNode;
  showButton?: boolean;
  state?: InputBoxState;
};

export default function InputBox({ action = "btn", className, showButton = true, state = "off", ...props }: InputBoxProps) {
  return (
    <div className={["figma-input-box", `figma-input-box--${state}`, className].filter(Boolean).join(" ")}>
      <textarea {...props} />
      {showButton && <span className="figma-input-box__action">{action}</span>}
    </div>
  );
}
