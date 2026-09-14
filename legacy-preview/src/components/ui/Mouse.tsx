type MouseProps = {
  className?: string;
  property1?: boolean;
};

export default function Mouse({ className, property1 = false }: MouseProps) {
  return <span className={["figma-device-icon", className].filter(Boolean).join(" ")}><img src={property1 ? "/assets/figma-mouse-on.svg" : "/assets/figma-mouse-off.svg"} alt="" /></span>;
}
