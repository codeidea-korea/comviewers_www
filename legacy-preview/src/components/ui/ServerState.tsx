export type ServerStateVariant = "on" | "off" | "disable" | "waiting";

type ServerStateProps = {
  className?: string;
  server?: ServerStateVariant;
};

export default function ServerState({ className, server = "on" }: ServerStateProps) {
  return <span className={["figma-server-state", `figma-server-state--${server}`, className].filter(Boolean).join(" ")}><img src={`/assets/figma-server-state-${server}.svg`} alt="" /></span>;
}
