import { useEffect, useRef, useState } from 'react'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import { Icon } from '../../../components/ui/IconControl'
import { useTranslation } from '../../../i18n/translation'
import heroMain from '../../../assets/figma/store/hero-main.png'
import heroMainMobile from '../../../assets/figma/store/hero-main-mobile.png'
import heroServerRoom from '../../../assets/figma/store/hero-server-room.png'
import heroMonitor from '../../../assets/figma/store/hero-monitor.png'
import './home-hero-slider.css'

const slides = [
  { image: heroMain, mobileImage: heroMainMobile },
  { image: heroServerRoom, mobileImage: heroServerRoom },
  { image: heroMonitor, mobileImage: heroMonitor },
]

export function HomeHeroSection() {
  const { locale, t } = useTranslation()
  const manualTitle = locale === 'en' || locale === 'ja' || locale === 'zh-CN' || locale === 'zh-TW'
  const [activeIndex, setActiveIndex] = useState(0)
  const [prefersReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [interacting, setInteracting] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const moveSlide = (direction: number) => setActiveIndex(index => (index + direction + slides.length) % slides.length)

  useEffect(() => {
    if (prefersReducedMotion || interacting) return
    const timer = window.setTimeout(() => setActiveIndex(index => (index + 1) % slides.length), 3000)
    return () => window.clearTimeout(timer)
  }, [activeIndex, prefersReducedMotion, interacting])

  return (
      <section className="home-hero" aria-label="메인 배너" aria-roledescription="캐러셀"
        onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}
        onTouchStart={event => { const touch = event.touches[0]; if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY } }}
        onTouchCancel={() => { touchStart.current = null }}
        onTouchEnd={event => {
          const start = touchStart.current
          const end = event.changedTouches[0]
          touchStart.current = null
          if (!start || !end) return
          const dx = end.clientX - start.x
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(end.clientY - start.y)) moveSlide(dx < 0 ? 1 : -1)
        }}>
        {slides.map((slide, index) => <picture key={slide.image} aria-hidden="true" className={`home-hero__slide${index > 0 ? ' home-hero__slide--native-ratio' : ''}${index === activeIndex ? ' is-active' : ''}`}>
          <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
          <img alt="" className="home-hero__image" src={slide.image} fetchPriority={index === 0 ? 'high' : 'low'} />
        </picture>)}
        <span aria-hidden="true" className="home-hero__shade" />
        <div className="content-container home-hero__content">
          <div>
            <h1 key={manualTitle ? 'manual-localized' : 'automatic'} className={manualTitle ? 'home-hero__title--manual notranslate' : undefined} translate={manualTitle ? 'no' : undefined}>{manualTitle ? t('catalogUi.homeHeroTitle') : 'RCPC 렌탈 마켓 플랫폼 전문기업'}<br />ComViewers</h1>
            <p className="home-hero__description--manual notranslate" translate="no">{t('catalogUi.homeHeroDevices')}<br />{t('catalogUi.homeHeroRental')}</p>
            <Link className="button button--large home-outline-button" to="/products">RCPC 상품 보기 <span aria-hidden="true" className="home-outline-button__icon"><Icon name="chevron-right" size={20} tone="inverse" /></span></Link>
          </div>
          <div className="hero-pagination">
            <span aria-hidden="true" className="hero-pagination__line"><span style={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }} /></span>
            <div className="hero-pagination__controls">
              <button aria-label="이전 배너" onClick={() => moveSlide(-1)} type="button"><Icon name="chevron-left" size={12} tone="inverse" /></button>
              <span className="notranslate" translate="no" aria-label={`${slides.length}개 중 ${activeIndex + 1}번째 배너`}><b>{activeIndex + 1}</b><span>/</span><span>{slides.length}</span></span>
              <button aria-label="다음 배너" onClick={() => moveSlide(1)} type="button"><Icon name="chevron-right" size={12} tone="inverse" /></button>
            </div>
          </div>
        </div>
      </section>
  )
}
