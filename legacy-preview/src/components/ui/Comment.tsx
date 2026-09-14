import Star from "./Star";

type CommentProps = {
  property1?: "community" | "product";
  show?: boolean;
  author?: string;
  date?: string;
  content?: string;
};

export default function Comment({ property1 = "community", show = false, author = "작성자", date = "2024.00.00", content = "내용" }: CommentProps) {
  const isProduct = property1 === "product";

  return (
    <article className={["figma-comment", isProduct && "figma-comment--product"].filter(Boolean).join(" ")}>
      <div className="figma-comment__avatar"><img src="/assets/figma-comment-user.svg" alt="" /></div>
      <div className="figma-comment__body">
        <div className="figma-comment__meta">
          <span className="figma-comment__author">{author}</span>
          {isProduct && <span className="figma-comment__stars"><Star /><Star /><Star /><Star /><Star property1={false} /></span>}
          <span className="figma-comment__date">{date}</span>
          {show && <span className="figma-comment__edited">수정됨</span>}
          <img className="figma-comment__more" src="/assets/figma-comment-more.svg" alt="" />
        </div>
        <p className="figma-comment__content">{content}</p>
      </div>
    </article>
  );
}
