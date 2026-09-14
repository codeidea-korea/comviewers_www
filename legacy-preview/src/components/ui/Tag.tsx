import { type ReactNode } from "react";

export type TagColor = "red" | "blue" | "gray" | "white";

type TagProps = {
  children?: ReactNode;
  className?: string;
  color?: TagColor;
  icon?: ReactNode;
  showIcon?: boolean;
};

export default function Tag({ children = "Tag", className, color = "blue", icon, showIcon = false }: TagProps) {
  return (
    <span className={["figma-tag", `figma-tag--${color}`, className].filter(Boolean).join(" ")}>
      <span>{children}</span>
      {showIcon && (icon ?? <img className="figma-tag__icon" src="/assets/figma-close.svg" alt="" />)}
    </span>
  );
}
