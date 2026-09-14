import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import { Icon } from '../../../components/ui/IconControl'
import ctaBackground from '../../../assets/figma/store/cta-background.png'
import ctaOverlay from '../../../assets/figma/store/cta-overlay.png'


export function HomeCallToAction() {
  return (
      <section className="home-cta">
        <div aria-hidden="true" className="home-cta__art">
          <img alt="" src={ctaBackground} />
          <img alt="" src={ctaOverlay} />
        </div>
        <div className="home-cta__content">
          <h2>지금 필요한 PC 환경을<br />ComViewers에서 바로 이용해보세요.</h2>
          <Link className="button button--large home-outline-button" to="/products">
            <span>RCPC 상품 보기</span>
            <Icon name="chevron-right" size={20} tone="inverse" />
          </Link>
        </div>
      </section>
  )
}
