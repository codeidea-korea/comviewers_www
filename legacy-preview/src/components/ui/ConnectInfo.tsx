export type ConnectInfoProperty1 = "AnyDesk" | "streamline-plump:web" | "teamviewer";

type ConnectInfoProps = {
  className?: string;
  property1?: ConnectInfoProperty1;
};

const sources: Record<ConnectInfoProperty1, string> = {
  AnyDesk: "/assets/figma-connect-anydesk.svg",
  "streamline-plump:web": "/assets/figma-connect-streamline-plump-web.svg",
  teamviewer: "/assets/figma-connect-teamviewer.svg",
};

export default function ConnectInfo({ className, property1 = "streamline-plump:web" }: ConnectInfoProps) {
  return <img className={["figma-connect-info", className].filter(Boolean).join(" ")} src={sources[property1]} alt="" />;
}
