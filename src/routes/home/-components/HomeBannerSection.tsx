import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import bannerGame from '../../../assets/figma/store/banner-game.png'
import bannerNew from '../../../assets/figma/store/banner-new.png'
import bannerOffice from '../../../assets/figma/store/banner-office.png'

const banners = [
  {
    image: bannerOffice,
    eyebrow: '업무에 최적화된 RCPC',
    title: <>문서 작업부터 협업 환경까지<br />안정적으로 지원합니다</>,
  },
  {
    image: bannerGame,
    eyebrow: '인기 게임을 위한 고성능 RCPC',
    title: <>안정적인 플레이 환경을<br />렌탈로 바로 이용해보세요</>,
  },
  {
    image: bannerNew,
    eyebrow: '새롭게 추가된 RCPC 상품',
    title: <>최신 사양의 원격 PC 환경을<br />빠르게 만나보세요</>,
  },
] as const

export function HomeBannerSection() {
  return (
    <section aria-label="상품 추천" className="banner-grid">
      {banners.map((banner, index) => (
        <Link className={`banner-grid__item banner-grid__item--${index + 1}`} key={banner.eyebrow} to="/products">
          <img alt="" src={banner.image} />
          <i aria-hidden="true" />
          <span>{banner.eyebrow}</span>
          <strong>{banner.title}</strong>
        </Link>
      ))}
    </section>
  )
}
