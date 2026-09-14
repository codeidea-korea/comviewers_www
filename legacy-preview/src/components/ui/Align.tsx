type AlignProps = {
  className?: string;
  property1?: "unfold_less";
};

export default function Align({ className }: AlignProps) {
  return <img className={["figma-align", className].filter(Boolean).join(" ")} src="/assets/figma-align-unfold-less.svg" alt="" />;
}
