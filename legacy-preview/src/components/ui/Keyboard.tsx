type KeyboardProps = {
  className?: string;
  property1?: boolean;
};

export default function Keyboard({ className, property1 = false }: KeyboardProps) {
  return <span className={["figma-device-icon", className].filter(Boolean).join(" ")}><img src={property1 ? "/assets/figma-keyboard-on.svg" : "/assets/figma-keyboard-off.svg"} alt="" /></span>;
}
