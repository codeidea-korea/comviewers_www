import { useState } from "react";
import {
  ASSET_ROOT,
  banners,
  boardColumns,
  infoBlocks,
  introCards,
  products,
  steps,
} from "./storefront-data";
import SiteFooter from "./components/layout/SiteFooter";
import SiteHeader from "./components/layout/SiteHeader";
import ProductCard from "./routes/main/-components/ProductCard";
import ShopApplicationPage from "./routes/shop-application/-components/ShopApplicationPage";

const categories = ["전체", "게임용", "광고마케팅", "스트리밍"];

export default function App() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isShopApplication, setIsShopApplication] = useState(() => window.location.hash === "#shop-application");

  if (isShopApplication) return <ShopApplicationPage onHome={() => { window.location.hash = "#top"; setIsShopApplication(false); }} />;

  return (
    <div className="storefront">
      <Hero menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((current) => !current)} onNavigate={() => setMenuOpen(false)} />
      <main>
        <IntroSection />
        <ProductSection activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        <BannerSection />
        <CommunitySection />
        <StepsSection />
        <InfoSection />
        <CallToAction />
      </main>
      <SiteFooter onShopApplication={() => { window.location.hash = "#shop-application"; setIsShopApplication(true); }} />
    </div>
  );
}

function Hero(props: { menuOpen: boolean; onMenuToggle: () => void; onNavigate: () => void }) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <SiteHeader {...props} />
      <img className="hero__image" src={`${ASSET_ROOT}/hero-bg.png`} alt="" />
      <div className="hero__shade" aria-hidden="true" />
      <div className="content-shell hero__content">
        <h1 id="hero-title"><span>RCPC 렌탈 마켓 플랫폼 전문기업</span><span>ComViewers</span></h1>
        <p>고사양 워크스테이션, 데스크탑 PC부터 PC방 컴퓨터, 젠서버 디바이스까지<br />필요한 조건에 맞는 RCPC를 간편하게 비교하고 자유롭게 임대할 수 있습니다.</p>
        <a className="button button--glass" href="#products">RCPC 상품 보기<img src={`${ASSET_ROOT}/hero-chevron.svg`} alt="" /></a>
      </div>
      <div className="content-shell hero__pagination" aria-label="메인 배너 1 / 40">
        <div className="hero__progress"><span /></div>
        <div className="hero__page"><img src={`${ASSET_ROOT}/hero-prev.svg`} alt="" /><span>1</span><i /><span>40</span><img src={`${ASSET_ROOT}/hero-next.svg`} alt="" /></div>
      </div>
    </section>
  );
}

function IntroSection() {
  return (
    <section className="intro-section" id="intro" aria-labelledby="intro-title"><div className="content-shell">
      <SectionHeading title="고성능 RCPC로 더 빠르고 안정적인 PC환경을 경험해 보세요." description={<>RCPC는 원격제어 프로그램으로 제어 가능한 워크스테이션, 데스크탑, 젠서버, 가상서버를 의미합니다.<br />필요한 PC환경을 직접 구축하지 말고 컴뷰어스에서 RCPC를 이용하세요</>} titleId="intro-title" />
      <div className="intro-grid">{introCards.map((card) => <article className="intro-card" key={card.title}><img src={card.image} alt="" /><h3>{card.title.split("\n").map((line, index) => <span className={index === 0 ? "intro-card__muted" : ""} key={line}>{line}</span>)}</h3><p>{card.description}</p></article>)}</div>
    </div></section>
  );
}

function ProductSection({ activeCategory, onCategoryChange }: { activeCategory: string; onCategoryChange: (category: string) => void }) {
  return (
    <section className="product-section" id="products" aria-labelledby="product-title"><div className="content-shell">
      <div className="product-heading"><SectionHeading title="추천 RCPC" description="원하는 작업 환경에 맞춰 최적의 RCPC를 선택하고 안정적으로 이용해보세요." titleId="product-title" /><a href="#products">더보기<img src={`${ASSET_ROOT}/product-zoom.svg`} alt="" /></a></div>
      <div className="category-tabs" aria-label="상품 분류">{categories.map((category) => <button key={category} className={activeCategory === category ? "category-tab is-active" : "category-tab"} type="button" aria-pressed={activeCategory === category} onClick={() => onCategoryChange(category)}>{category}</button>)}</div>
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div></section>
  );
}

function BannerSection() {
  return <section className="banner-section" id="banners" aria-label="RCPC 활용 안내"><div className="banner-grid">{banners.map((banner, index) => <article className={`promo-banner promo-banner--${index + 1}`} key={banner.eyebrow}><img src={banner.image} alt="" />{banner.overlay && <img className="promo-banner__overlay-image" src={banner.overlay} alt="" />}<div className="promo-banner__shade" /><div className="promo-banner__text"><p>{banner.eyebrow}</p><h2>{banner.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h2></div></article>)}</div></section>;
}

function CommunitySection() {
  return (
    <section className="community-section" id="community" aria-labelledby="community-title"><div className="content-shell">
      <h2 className="visually-hidden" id="community-title">컴뷰어스 소식과 커뮤니티</h2>
      <a className="notice" href="#community"><strong>공지사항</strong><span>칠곡서버실 임시점검 안내 [4월 8일 수요일 08시 ~ 14시]</span><time>2026.07.22</time><img src={`${ASSET_ROOT}/qna-notice-arrow.svg`} alt="" /></a>
      <div className="board-grid">{boardColumns.map((board) => <article className="board" key={board.title}><header><h3>{board.title}</h3><a href="#community">{board.action}<img src={`${ASSET_ROOT}/qna-chevron.svg`} alt="" /></a></header><ul>{board.items.map((item, index) => <li key={`${item}-${index}`}><a href="#community"><span className="board__subject">{item}</span><span className="board__comments"><img src={`${ASSET_ROOT}/qna-chat.svg`} alt="" />2</span><time>2026.07.22</time></a></li>)}</ul></article>)}</div>
    </div></section>
  );
}

function StepsSection() {
  return (
    <section className="steps-section" id="steps" aria-labelledby="steps-title"><div className="content-shell">
      <SectionHeading title="복잡한 설치 없이 구매 즉시 이용" description="원하는 RCPC 상품을 구매하면 원격 접속 정보를 바로 확인하고 이용할 수 있습니다." titleId="steps-title" />
      <div className="steps-grid">{steps.map((step, index) => <div className="step-slot" key={step.title}><article className="step-card"><div className="step-card__track">{steps.map((_, trackIndex) => <span className={trackIndex === index ? "is-active" : ""} key={trackIndex}>STEP {trackIndex + 1}</span>)}</div><div className="step-card__body"><img src={step.icon} alt="" /><h3>{step.title}</h3><p>{step.description.split("\n").map((line) => <span key={line}>{line}</span>)}</p></div></article>{index < steps.length - 1 && <img className="step-connector" src={`${ASSET_ROOT}/step-arrow.svg`} alt="" />}</div>)}</div>
      <div className="guide-card"><img className="guide-card__watermark" src={`${ASSET_ROOT}/step-watermark.png`} alt="" /><div><h3>ComViewers 이용이 처음이신가요?</h3><p>자세한 접속 방법과 이용 전 확인사항은 이용안내에서 확인할 수 있습니다.</p></div><a className="button button--outline" href="#community">이용안내 자세히 보기<img src={`${ASSET_ROOT}/chevron-dark.svg`} alt="" /></a></div>
    </div></section>
  );
}

function InfoSection() {
  return <section className="info-section" id="info" aria-labelledby="info-title"><div className="content-shell"><SectionHeading title="보안과 안정성을 고려한 RCPC 이용 환경" description="접속 권한과 상태 정보를 안전하게 관리하여, 안정적인 RCPC 이용 환경을 제공합니다." titleId="info-title" /><div className="info-grid">{infoBlocks.map((block) => <article className="info-card" key={block.title}><h3>{block.title}</h3><p>{block.description}</p><img src={block.icon} alt="" /></article>)}</div></div></section>;
}

function CallToAction() {
  return <section className="cta-section" id="cta" aria-labelledby="cta-title"><img src={`${ASSET_ROOT}/cta-base.png`} alt="" /><img className="cta-section__overlay" src={`${ASSET_ROOT}/cta-overlay.png`} alt="" /><div className="cta-section__content"><h2 id="cta-title">지금 필요한 PC 환경을<br />ComViewers에서 바로 이용해보세요.</h2><a className="button button--glass" href="#products">RCPC 상품 보기<img src={`${ASSET_ROOT}/chevron-light.svg`} alt="" /></a></div></section>;
}

function SectionHeading({ title, description, titleId }: { title: string; description: React.ReactNode; titleId: string }) {
  return <div className="section-heading"><h2 id={titleId}>{title}</h2><p>{description}</p></div>;
}





