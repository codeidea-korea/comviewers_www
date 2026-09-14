import { type ReactNode } from "react";
import { ASSET_ROOT } from "../../storefront-data";

const navigation = ["RCPC상품", "RCPC방", "젠서버", "파트상품", "커뮤니티"];

type SiteHeaderProps = {
  cartCount?: ReactNode;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onNavigate: () => void;
  state?: "main" | "sub";
};

export default function SiteHeader({ cartCount = "24", menuOpen, onMenuToggle, onNavigate, state = "main" }: SiteHeaderProps) {
  return (
    <header className={`site-header site-header--${state}`}>
      <div className="site-header__utility"><div className="content-shell utility-row"><span>게임부터 작업까지, 원하는 PC 환경을 RCPC로 간편하게</span><nav aria-label="사용자 메뉴"><a className="site-header__cart" href="#footer">장바구니<span>{cartCount}</span></a><a href="#footer">로그인</a><a href="#footer">회원가입</a></nav></div></div>
      <div className="site-header__navigation"><div className="content-shell site-header__main">
        <a className="site-logo" href="#top" aria-label="ComViewers 홈"><img src={state === "sub" ? "/assets/figma-logo-sub.png" : `${ASSET_ROOT}/logo-header.png`} alt="ComViewers" /></a>
        <button className="menu-toggle" type="button" aria-label="메뉴 열기" aria-expanded={menuOpen} onClick={onMenuToggle}><span /><span /><span /></button>
        <nav data-testid="primary-navigation" className={menuOpen ? "primary-navigation is-open" : "primary-navigation"} aria-label="주요 메뉴">
          {navigation.map((item, index) => <a key={item} href={index === 0 ? "#products" : "#community"} onClick={onNavigate}>{item}</a>)}
        </nav>
      </div></div>
    </header>
  );
}
