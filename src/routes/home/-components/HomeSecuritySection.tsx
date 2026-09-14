import securityAccess from '../../../assets/figma/store/security-access.png'
import securityNetwork from '../../../assets/figma/store/security-network.png'
import securityRemote from '../../../assets/figma/store/security-remote.png'
import securityStatus from '../../../assets/figma/store/security-status.png'
import { SectionHeading } from './HomeSectionHeading'

const securityItems = [
  { image: securityRemote, title: '원격제어 기반 접속 구조', description: <>사용자는 <strong>별도 장비 설치 없이</strong> 원격제어 환경을 통해 RCPC에 접속할 수 있으며, 상품별 접속 정보를 기준으로 필요한 PC 환경을 이용할 수 있습니다.</> },
  { image: securityStatus, title: '상태 신호 기반 운영 확인', description: <>RCPC 상품의 상태 신호를 기준으로 <strong>운영 여부를 실시간으로 확인</strong>하고, 상품 이용에 필요한 <strong>상태 정보를 보다 체계적으로 관리</strong>할 수 있습니다.</> },
  { image: securityAccess, title: '이용 권한 기반 접속 정보 제공', description: <>RCPC 접속 정보는 <strong>주문 및 이용 권한을 기준으로 제공</strong>되며, 사용자는 본인에게 부여된 상품 정보에 따라 원격 PC에 접속할 수 있습니다.</> },
  { image: securityNetwork, title: '네트워크 접속 환경 지원', description: <>RCPC 이용에 필요한 원격 접속 환경과 네트워크 구성을 기반으로, <strong>사용자가 안정적으로 PC 환경에 연결</strong>할 수 있도록 지원합니다.</> },
]


export function HomeSecuritySection() {
  return (
      <section className="home-section security-section"><div className="content-container"><SectionHeading description="접속 권한과 상태 정보를 안전하게 관리하여, 안정적인 RCPC 이용 환경을 제공합니다.">보안과 안정성을 고려한 RCPC 이용 환경</SectionHeading><div className="security-grid">{securityItems.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.description}</p><img alt="" src={item.image} /></article>)}</div></div></section>
  )
}
