import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import stepAccess from '../../../assets/figma/store/step-access.svg'
import stepBuy from '../../../assets/figma/store/step-buy.svg'
import stepCompare from '../../../assets/figma/store/step-compare.svg'
import stepUse from '../../../assets/figma/store/step-use.svg'
import usageInfoWatermark from '../../../assets/figma/store/usage-info-watermark.png'
import { SectionHeading } from './HomeSectionHeading'

const steps = [
  { image: stepCompare, title: '비교하기', description: '원하는 RCPC 상품을 비교해보세요.' },
  { image: stepBuy, title: '구매하기', description: 'RCPC 상품 구매를 진행해보세요.' },
  { image: stepAccess, title: '접속확인', description: '원격 접속 정보를 확인해요.' },
  { image: stepUse, title: '즉시이용', description: '바로 이용이 가능해요.' },
]

export function HomeUsageSection({ articleId }: { articleId?: string }) {
  return (
      <section className="home-section usage-section"><div className="content-container"><SectionHeading description="원하는 RCPC 상품을 구매하면 원격 접속 정보를 바로 확인하고 이용할 수 있습니다.">복잡한 설치 없이 구매 즉시 이용</SectionHeading><div className="steps-grid">{steps.map((step, index) => <article key={step.title}><div className="step-tabs">{steps.map((_, tabIndex) => <span className={index === tabIndex ? 'is-active' : ''} key={tabIndex}>STEP {tabIndex + 1}</span>)}</div><div><img alt="" src={step.image} /><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div><aside className="usage-help"><div><strong>ComViewers 이용이 처음이신가요?</strong><p>자세한 접속 방법과 이용 전 확인사항은 이용안내에서 확인할 수 있습니다.</p></div><Link className="button button--large button--secondary" to={articleId ? `/support/${articleId}` : "/support?keyword=이용안내"}>이용안내 자세히 보기 ›</Link><img alt="" aria-hidden="true" className="usage-help__watermark" src={usageInfoWatermark} /></aside></div></section>
  )
}
