type SidemenuScrapListProps = {
  state?: "manage" | "focus" | "default";
  initial?: string;
  title?: string;
  count?: string;
};

export default function SidemenuScrapList({ state = "default", initial = "L", title = "발산", count = "1" }: SidemenuScrapListProps) {
  return <div className={["figma-sidemenu-scrap-list", `figma-sidemenu-scrap-list--${state}`].join(" ")}><span className="figma-sidemenu-scrap-list__title"><span>{initial}</span><span>{title}</span></span>{state === "manage" ? <span className="figma-sidemenu-scrap-list__actions"><img src="/assets/figma-sidemenu-delete.svg" alt="" /><img src="/assets/figma-sidemenu-drag.svg" alt="" /></span> : <span className="figma-sidemenu-scrap-list__count">{count}</span>}</div>;
}
