type FlagProps = {
  className?: string;
  nation?: "korea";
};

export default function Flag({ className }: FlagProps) {
  return <img className={["figma-flag", className].filter(Boolean).join(" ")} src="/assets/figma-flag-korea.png" alt="" />;
}
