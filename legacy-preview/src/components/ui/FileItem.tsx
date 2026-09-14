import { type ReactNode } from "react";

export type FileItemState = "edit" | "down";

type FileItemProps = {
  children?: ReactNode;
  className?: string;
  fileSize?: ReactNode;
  state?: FileItemState;
};

export default function FileItem({ children = "P-1784685075226-Czc8YYD.png", className, fileSize = "3mb", state = "edit" }: FileItemProps) {
  return (
    <div className={["figma-file-item", `figma-file-item--${state}`, className].filter(Boolean).join(" ")}>
      <span className="figma-file-item__info"><span>{children}</span><span>{fileSize}</span></span>
      {state === "edit" ? <span className="figma-file-item__close"><img src="/assets/figma-file-close.svg" alt="" /></span> : <img className="figma-file-item__download" src="/assets/figma-file-download.svg" alt="" />}
    </div>
  );
}
