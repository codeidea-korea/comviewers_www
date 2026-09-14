import { type ButtonHTMLAttributes, type ReactNode } from "react";

type PaymentLogo = "mastercard" | "visa" | "wechat" | "jcb" | "npay" | "kakao-pay";

type SelectButtonMProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  selected?: boolean;
  showLogo?: boolean;
  showPay?: boolean;
  showText?: boolean;
  logo?: PaymentLogo;
};

const logoSource: Record<PaymentLogo, string> = {
  mastercard: "/assets/figma-payment-mastercard.svg",
  visa: "/assets/figma-payment-visa.svg",
  wechat: "/assets/figma-payment-wechat.svg",
  jcb: "/assets/figma-payment-jcb.svg",
  npay: "/assets/figma-payment-npay.svg",
  "kakao-pay": "/assets/figma-payment-kakao-pay.png",
};

export default function SelectButtonM({ children = "Text", className, selected = false, showLogo = false, showPay = false, showText = true, logo = "mastercard", type = "button", ...props }: SelectButtonMProps) {
  return (
    <button {...props} aria-pressed={selected} className={["figma-select-button-m", selected && "figma-select-button-m--selected", className].filter(Boolean).join(" ")} type={type}>
      <img className="figma-select-button-m__radio" src={selected ? "/assets/figma-select-button-m-radio-on.svg" : "/assets/figma-select-button-m-radio-off.svg"} alt="" />
      {showLogo && <img className="figma-select-button-m__logo" src={logoSource[logo]} alt="" />}
      {showPay && <span className="figma-select-button-m__pay">Pay</span>}
      {showText && <span>{children}</span>}
    </button>
  );
}
