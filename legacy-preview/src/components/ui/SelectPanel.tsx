import SelectBoxS from "./SelectBox";

type SelectPanelProps = {
  changeIcon?: boolean;
  menu?: string;
};

export default function SelectPanel({ changeIcon = true, menu = "menu" }: SelectPanelProps) {
  return (
    <div className="figma-select-panel">
      <span className="figma-select-panel__content">
        <SelectBoxS state="off" />
        <span>{menu}</span>
      </span>
      <img className="figma-select-panel__icon" src={changeIcon ? "/assets/figma-select-panel-up.svg" : "/assets/figma-select-panel-down.svg"} alt="" />
    </div>
  );
}
