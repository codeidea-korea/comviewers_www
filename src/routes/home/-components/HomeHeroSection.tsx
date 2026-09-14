import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import heroMain from '../../../assets/figma/store/hero-main.png'


export function HomeHeroSection() {
  return (
      <section className="home-hero">
        <img alt="" className="home-hero__image" src={heroMain} />
        <span aria-hidden="true" className="home-hero__shade" />
        <div className="content-container home-hero__content">
          <div><h1>RCPC 렌탈 마켓 플랫폼 전문기업<br />ComViewers</h1><p>고사양 워크스테이션, 데스크탑 PC부터 PC방 컴퓨터, 젠서버 디바이스까지<br />필요한 조건에 맞는 RCPC를 간편하게 비교하고 자유롭게 임대할 수 있습니다.</p><Link className="button button--large home-outline-button" to="/products">RCPC 상품 보기 <span aria-hidden="true">›</span></Link></div>
          <div className="hero-pagination"><span className="hero-pagination__line" /><b>‹ &nbsp; 1</b><span>/</span><span>1 &nbsp; ›</span></div>
        </div>
      </section>
  )
}
