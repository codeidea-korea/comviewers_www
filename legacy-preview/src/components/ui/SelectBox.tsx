export type SelectBoxState = "off" | "on" | "-" | "disabled";
export type SelectBoxSize = "s" | "m";

type SelectBoxProps = {
  className?: string;
  size?: SelectBoxSize;
  state?: SelectBoxState;
};

export default function SelectBox({ className, size = "s", state = "off" }: SelectBoxProps) {
  const icon = state === "on" ? "check" : state === "-" ? "dash" : null;

  return (
    <span aria-hidden="true" className={["figma-select-box", `figma-select-box--${size}`, `figma-select-box--${state}`, className].filter(Boolean).join(" ")}>
      {icon && <img src={`/assets/figma-${icon}-${size}.svg`} alt="" />}
    </span>
  );
}

export function SelectBoxS(props: Omit<SelectBoxProps, "size">) {
  return <SelectBox {...props} size="s" />;
}

export function SelectBoxM(props: Omit<SelectBoxProps, "size">) {
  return <SelectBox {...props} size="m" />;
}
