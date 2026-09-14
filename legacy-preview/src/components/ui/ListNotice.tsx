import { type ReactNode } from "react";

export type ListNoticeProperty1 = "Default" | "고정";

type ListNoticeProps = {
  className?: string;
  date?: ReactNode;
  number?: ReactNode;
  property1?: ListNoticeProperty1;
  showAttachment?: boolean;
  title?: ReactNode;
};

export default function ListNotice({
  className,
  date = "2026.07.22",
  number = "207",
  property1 = "고정",
  showAttachment = true,
  title = "컴퓨터원격렌탈 서비스 이용 안내",
}: ListNoticeProps) {
  const isPinned = property1 === "고정";

  return (
    <div className={["figma-list-notice", className].filter(Boolean).join(" ")}>
      <div className="figma-list-notice__content">
        {isPinned ? <span className="figma-list-notice__pin"><img src="/assets/figma-notice-keep.svg" alt="" /></span> : <span className="figma-list-notice__number">{number}</span>}
        <span className={["figma-list-notice__title", isPinned && "figma-list-notice__title--pinned"].filter(Boolean).join(" ")}><span>{title}</span>{showAttachment && <img src="/assets/figma-notice-attachment.svg" alt="" />}</span>
      </div>
      <span className="figma-list-notice__date">{date}</span>
    </div>
  );
}
