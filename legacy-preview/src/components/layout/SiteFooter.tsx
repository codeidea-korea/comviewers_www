import { ASSET_ROOT } from "../../storefront-data";

type SiteFooterProps = {
  onShopApplication: () => void;
};

export default function SiteFooter({ onShopApplication }: SiteFooterProps) {
  return (
    <footer className="site-footer" id="footer"><div className="content-shell">
      <nav className="footer-menu" aria-label="회사 메뉴"><a href="#footer">회사소개</a><a href="#shop-application" onClick={onShopApplication}>입점신청</a></nav>
      <div className="footer-main"><img className="footer-logo" src={`${ASSET_ROOT}/logo-header.png`} alt="ComViewers" /><div className="footer-info"><div className="footer-company"><p><strong>회사명</strong> (주)아이알씨코리아 <i /><strong>대표자명</strong> 최주호 <i /><strong>사업자등록번호</strong> 821-88-01743 <a href="#footer">[사업자정보확인]</a></p><p><strong>통신판매업신고번호</strong> 2022-강원원주-1569 <i /><strong>개인정보보호책임자</strong> 최주호, 전민경 <i /><strong>호스팅제공자</strong> (주)아이알씨코리아</p><p><strong>주소</strong> 강원도 원주시 황금로 2, 5층 401호 <i /><strong>연락처</strong> 010-8342-1326 <i /><strong>이메일</strong> counter2017@naver.com</p></div><div className="footer-support"><p><strong>고객센터</strong> 운영시간 <em>평일 11:00 ~ 19:00 (점심시간 13:00 ~ 14:00)</em></p><p><a href="#community">1:1 문의하기</a><i /><a href="https://t.me/PCUV7" target="_blank" rel="noreferrer">텔레그램 상담</a><i /><a href="#footer">카카오톡ID 복사</a></p></div></div></div>
      <div className="footer-bottom"><nav><a href="#footer">서비스 이용약관</a><a href="#footer"><strong>개인정보처리방침</strong></a></nav><span>Copyright © ComViewers.com All rights reserved.</span></div>
    </div></footer>
  );
}
