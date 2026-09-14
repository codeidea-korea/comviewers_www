type RadioButtonProps = {
  className?: string;
  selected?: boolean;
};

export default function RadioButton({ className, selected = false }: RadioButtonProps) {
  return (
    <span aria-hidden="true" className={["figma-radio-button", selected && "figma-radio-button--selected", className].filter(Boolean).join(" ")}>
      {selected && <img src="/assets/figma-radio-selected.svg" alt="" />}
    </span>
  );
}
