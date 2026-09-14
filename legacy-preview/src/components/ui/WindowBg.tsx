type WindowBgVariant = "window - 1" | "window - 2" | "window - 3" | "window - 4" | "window - 5" | "window - 6" | "window - 7" | "window - 8";

type WindowBgProps = {
  property1?: WindowBgVariant;
};

const source: Record<WindowBgVariant, string> = {
  "window - 1": "/assets/figma-window-bg-1.png",
  "window - 2": "/assets/figma-window-bg-2.png",
  "window - 3": "/assets/figma-window-bg-3.png",
  "window - 4": "/assets/figma-window-bg-4.png",
  "window - 5": "/assets/figma-window-bg-5.png",
  "window - 6": "/assets/figma-window-bg-6.png",
  "window - 7": "/assets/figma-window-bg-7.png",
  "window - 8": "/assets/figma-window-bg-8.png",
};

export default function WindowBg({ property1 = "window - 1" }: WindowBgProps) {
  const hasBase = property1 !== "window - 1" && property1 !== "window - 8";
  return <div className="figma-window-bg">{hasBase && <img className="figma-window-bg__image" src={source["window - 1"]} alt="" />}<img className="figma-window-bg__image" src={source[property1]} alt="" /><img className="figma-window-bg__logo" src="/assets/figma-window-bg-logo.svg" alt="" /></div>;
}
