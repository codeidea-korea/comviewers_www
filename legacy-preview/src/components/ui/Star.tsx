type StarProps = {
  className?: string;
  property1?: boolean;
};

export default function Star({ className, property1 = true }: StarProps) {
  return <img className={["figma-star", className].filter(Boolean).join(" ")} src={property1 ? "/assets/figma-star-on.svg" : "/assets/figma-star-off.svg"} alt="" />;
}
