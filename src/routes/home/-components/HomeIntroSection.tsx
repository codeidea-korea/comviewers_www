import introCompare from '../../../assets/figma/store/intro-compare.png'
import introHardware from '../../../assets/figma/store/intro-hardware.png'
import introServer from '../../../assets/figma/store/intro-server.png'
import { SectionHeading } from './HomeSectionHeading'

const introItems = [
  { image: introHardware, muted: '하드웨어를 구매하지 않아도', title: '전문 PC 환경에서', description: '새로운 장비를 직접 구매하지 않아도 필요한 고사양 PC 또는 특정 콘텐츠가 구성된 PC 환경을 간편하게 렌탈하여 사용할 수 있습니다.' },
  { image: introCompare, muted: '사양과 목적에 맞는', title: 'RCPC 상품 비교', description: 'CPU, RAM, SSD, GPU, OS 등 주요 사양과 이용 조건을 확인하고 업무, 연구, 교육, 테스트 등 목적에 맞는 상품을 선택할 수 있습니다.' },
  { image: introServer, muted: '서버실 기반의', title: '전문 운영 구조', description: '서버실에서 운영되는 RCPC 상품을 기반으로 상품 정보, 이용 조건, 원격 접속 환경을 확인할 수 있어 보다 체계적인 이용이 가능합니다.' },
]

export function HomeIntroSection() {
  return (
      <section className="home-section intro-section">
        <div className="content-container">
          <SectionHeading description={<>RCPC는 원격제어 프로그램으로 제어 가능한 워크스테이션, 데스크탑, 젠서버, 가상서버를 의미합니다.<br />필요한 PC환경을 직접 구축하지 말고 컴뷰어스에서 RCPC를 이용하세요</>}>고성능 RCPC로 더 빠르고 안정적인 PC환경을 경험해 보세요.</SectionHeading>
          <div className="intro-grid">{introItems.map((item) => <article key={item.title}><div className="intro-grid__image"><img alt="" src={item.image} /></div><h3><span>{item.muted}</span><br />{item.title}</h3><p>{item.description}</p></article>)}</div>
        </div>
      </section>
  )
}
