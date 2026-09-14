type TabFocusProps = {
  focus?: boolean;
  num?: string;
  showNum?: boolean;
  text?: string;
};

export default function TabFocus({ focus = true, num = "20", showNum = true, text = "Text" }: TabFocusProps) {
  return <div className={["figma-tab-focus", focus && "figma-tab-focus--on"].filter(Boolean).join(" ")}><span>{text}</span>{showNum && <span>{num}</span>}</div>;
}
