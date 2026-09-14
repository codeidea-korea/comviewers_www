import { CompanyBenefits } from './-components/CompanyBenefits'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import companyHeroLayer1 from '../../assets/figma/community-company/company-hero-layer-1.png'
import companyHeroLayer2 from '../../assets/figma/community-company/company-hero-layer-2.png'
import companyHeroLayer3 from '../../assets/figma/community-company/company-hero-layer-3.png'
import companySide from '../../assets/figma/community-company/company-story-monitor.png'
import companyCta from '../../assets/figma/community-company/company-cta-render.png'
import companyNetwork from '../../assets/figma/community-company/company-network-render.png'
import companyUseDesktop from '../../assets/figma/community-company/company-use-desktop.svg'
import companyUseAnalysis from '../../assets/figma/community-company/company-use-analysis.svg'
import companyUseProject from '../../assets/figma/community-company/company-use-project.svg'
import companyUseEducation from '../../assets/figma/community-company/company-use-education.svg'
import companyRcpcOuter from '../../assets/figma/community-company/company-rcpc-ring-outer.svg'
import companyRcpcMiddle from '../../assets/figma/community-company/company-rcpc-ring-middle.svg'
import companyRcpcInner from '../../assets/figma/community-company/company-rcpc-ring-inner.svg'
import { AppShell } from '../../components/layout/AppShellView'

const useCases: [string, string, string, string[]][] = [
  [companyUseDesktop, '높은 사양의 PC가 필요할 때', '게임이나 고사양 프로그램 실행을 위해 높은 성능의 PC가 필요하지만 새로운 장비를 직접 구매하기 부담스러운 경우', ['개인 사용자', '고사양 프로그램 사용자']],
  [companyUseAnalysis, '연구·분석을 위한 컴퓨팅 환경이 필요할 때', '연구, 분석, 검증 등 일정 수준 이상의 컴퓨팅 성능이나 특정 사양의 PC 환경이 필요한 업무에 활용', ['연구소', '개발자', '분석 사용자']],
  [companyUseProject, '테스트 또는 프로젝트용 환경이 필요할 때', '개발 테스트, 프로그램 검증, 프로젝트 수행 등 별도의 PC 환경이 빠르게 필요한 경우', ['기업', '실무자', '개발 사용자']],
  [companyUseEducation, '교육·실습 환경을 준비해야 할 때', '특정 프로그램이나 콘텐츠가 구성된 PC 환경이 필요한 수업, 실습, 교육 과정에서 활용', ['학교', '학원', '교육기관']],
]

export function CompanyAboutPage() {
  return <AppShell className="company-shell company-catalog-shell" headerState="main">
    <section className="company-catalog-hero"><div aria-hidden="true" className="company-catalog-hero__art"><img alt="" src={companyHeroLayer1}/><img alt="" src={companyHeroLayer2}/><img alt="" src={companyHeroLayer3}/></div><div className="content-container"><small>ComViewers는</small><h1><strong>컴퓨터 사용에 대한 새로운 선택지</strong>를 제공하는 RCPC 렌탈 마켓 플랫폼을 만들어갑니다.</h1></div></section>
    <section className="company-catalog-story"><div className="content-container"><article><h2>컴퓨터가 필요한 다양한 순간<br/>RCPC로 더 간편하게</h2><p>게임, 연구·분석, 테스트, 교육·실습 등 다양한 분야와 상황에서 RCPC를 활용할 수 있습니다. 장비를 직접 구성하고 구매하는 대신 원하는 조건의 컴퓨터를 선택해 원격으로 이용해 보세요.</p><img alt="ComViewers RCPC" src={companySide}/></article><div>{useCases.map(([icon,title,description,tags])=><section key={title}><h3><img alt="" src={icon}/>{title}</h3><p>{description}</p><div className="company-use-tags">{tags.map(tag=><span key={tag}>✓ {tag}</span>)}</div></section>)}</div></div></section>
    <section className="company-catalog-rcpc"><div aria-hidden="true" className="company-catalog-rcpc__art"><img alt="" src={companyRcpcOuter}/><img alt="" src={companyRcpcMiddle}/><img alt="" src={companyRcpcInner}/></div><div className="content-container"><div><small>원격으로 제어 가능한 개인용 컴퓨터</small><h2>RCPC</h2></div><p><span><b>R</b>EMOTE</span><i/><span><b>C</b>ONTROL</span><i/><span><b>P</b>ERSONAL</span><i/><span><b>C</b>OMPUTER</span></p></div></section>
    <section className="company-catalog-platform"><div className="content-container"><header><small>RCPC 렌탈 마켓 플랫폼 ComViewers</small><h2>ComViewers는 RCPC를 제공하는 사람과, 필요한 사람을 연결합니다.</h2></header><div className="company-network-art"><img alt="RCPC 연결 네트워크" src={companyNetwork}/></div><p className="company-platform-copy">일반적인 마켓이 판매자와 소비자로 구성되는 것처럼, <strong>ComViewers</strong>는 RCPC를 사용할 수 있는 권리를 제공하는 Seller와 그 권리를 이용하는 Buyer를 연결합니다.<br/>Seller가 고사양 또는 특정 콘텐츠와 사용 환경이 구성된 RCPC를 마켓에 등록하면, Buyer는 목적에 맞는 상품을 선택하고 일정 기간 원격제어 방식으로 이용할 수 있습니다.</p><div><article><b>ComViewers<br/>상품 비교와 이용 연결</b><p>RCPC 상품을 찾는 과정부터 실제 이용까지 이어질 수 있도록 플랫폼 환경을 제공합니다.</p></article><article><b>Seller<br/>RCPC 상품 등록</b><p>운영 중인 RCPC의 사양과 이용 조건을 등록하고 상품으로 제공합니다.</p></article><article><b>Buyer<br/>RCPC 원격 이용</b><p>원하는 조건의 상품을 선택하고 제공된 접속 정보로 RCPC를 원격 이용합니다.</p></article></div></div></section>
    <CompanyBenefits />
    <section className="company-catalog-cta" style={{backgroundImage:`url(${companyCta})`}}><div className="content-container"><h2>지금 필요한 PC 환경을<br/>ComViewers에서 바로 이용해보세요.</h2><Link to="/products">RCPC 상품 보기　›</Link></div></section>
  </AppShell>
}
