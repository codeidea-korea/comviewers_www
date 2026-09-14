import { type ButtonHTMLAttributes } from "react";

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  size?: "s" | "m";
  state?: boolean;
};

export default function Switch({ className, size = "m", state = true, type = "button", ...props }: SwitchProps) {
  return (
    <button
      {...props}
      aria-pressed={state}
      className={["figma-switch", `figma-switch--${size}`, state ? "figma-switch--on" : "figma-switch--off", className].filter(Boolean).join(" ")}
      type={type}
    >
      <span className="figma-switch__handle" />
    </button>
  );
}

export function SwitchS(props: Omit<SwitchProps, "size">) {
  return <Switch {...props} size="s" />;
}

export function SwitchM(props: Omit<SwitchProps, "size">) {
  return <Switch {...props} size="m" />;
}
