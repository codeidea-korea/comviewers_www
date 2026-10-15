import { useEffect, useRef, useState } from 'react'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import { Icon } from '../../../components/ui/IconControl'
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [interacting, setInteracting] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const moveSlide = (direction: number) => setActiveIndex(index => (index + direction + slides.length) % slides.length)

  useEffect(() => {
    if (paused || interacting) return
    const timer = window.setTimeout(() => setActiveIndex(index => (index + 1) % slides.length), 5000)
    return () => window.clearTimeout(timer)
  }, [activeIndex, paused, interacting])

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
          <div><h1>RCPC 렌탈 마켓 플랫폼 전문기업<br />ComViewers</h1><p>고사양 워크스테이션, 데스크탑 PC부터 PC방 컴퓨터, 젠서버 디바이스까지<br />필요한 조건에 맞는 RCPC를 간편하게 비교하고 자유롭게 임대할 수 있습니다.</p><Link className="button button--large home-outline-button" to="/products">RCPC 상품 보기 <span aria-hidden="true" className="home-outline-button__icon"><Icon name="chevron-right" size={20} tone="inverse" /></span></Link></div>
          <div className="hero-pagination">
            <span aria-hidden="true" className="hero-pagination__line"><span style={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }} /></span>
            <div className="hero-pagination__controls">
              <button aria-label="이전 배너" onClick={() => moveSlide(-1)} type="button"><Icon name="chevron-left" size={12} tone="inverse" /></button>
              <span aria-label={`${slides.length}개 중 ${activeIndex + 1}번째 배너`}><b>{activeIndex + 1}</b><span> / {slides.length}</span></span>
              <button aria-label="다음 배너" onClick={() => moveSlide(1)} type="button"><Icon name="chevron-right" size={12} tone="inverse" /></button>
              <button aria-label={paused ? '배너 자동 전환 재생' : '배너 자동 전환 일시정지'} onClick={() => setPaused(value => !value)} type="button">{paused ? '▶' : 'Ⅱ'}</button>
            </div>
          </div>
        </div>
      </section>
  )
}
