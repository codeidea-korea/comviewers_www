import { useState } from 'react'
import companyBenefitCustomer from '../../../assets/figma/community-company/company-benefit-customer.svg'
import companyBenefitGrowth from '../../../assets/figma/community-company/company-benefit-growth.svg'
import companyBenefitSocial from '../../../assets/figma/community-company/company-benefit-social.svg'
import companyBenefitTech from '../../../assets/figma/community-company/company-benefit-tech.svg'

const benefits: [string, string, string][] = [
  [companyBenefitCustomer, '고객 중심의 서비스 제공', '고객의 요구에 맞는 맞춤형 서비스를 제공합니다.\n고객의 불편함을 최소화하기 위해 24시간 원격 지원 서비스를 제공합니다.\n고객의 만족도를 높이기 위해 지속적으로 서비스를 개선합니다.'],
  [companyBenefitTech, '기술 중심의 기업', '새로운 기술과 안정적인 운영 환경을 바탕으로 서비스를 발전시킵니다.'],
  [companyBenefitSocial, '사회적 책임을 다하는 기업', '신뢰할 수 있는 RCPC 이용 환경과 책임 있는 서비스를 만들어갑니다.'],
  [companyBenefitGrowth, '지속적인 성장', '서버실 파트너와 함께 더 안정적인 RCPC 네트워크를 만듭니다.'],
]

export function CompanyBenefits() {
  const [openBenefit, setOpenBenefit] = useState(0)
  const [hoveredBenefit, setHoveredBenefit] = useState<number | null>(null)
  const visibleBenefit = hoveredBenefit ?? openBenefit

  return (
    <section className="company-catalog-benefits"><div className="content-container"><header><small>MORE VALUE</small><h2>더 많은 사람이 필요한 컴퓨터를<br/>더 편리하게 이용할 수 있도록</h2></header><div>{benefits.map(([icon,title,description],index)=><article className={visibleBenefit===index?'is-open':''} key={title} onMouseEnter={()=>setHoveredBenefit(index)} onMouseLeave={()=>setHoveredBenefit(null)}><button aria-expanded={visibleBenefit===index} onClick={()=>setOpenBenefit(value=>value===index?-1:index)} type="button"><span>0{index+1}</span><strong><img alt="" src={icon}/>{title}</strong><b>{visibleBenefit===index?'−':'+'}</b></button><p aria-hidden={visibleBenefit!==index}>{description}</p></article>)}</div></div></section>
  )
}
