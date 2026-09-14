import { useState } from "react";
import { FieldLabel, UnderlineInput, UnderlineSelect } from "../../../components/ui/ApplicationFields";

type ShopApplicationPageProps = { onHome: () => void };

const termsText = `제1장 총칙
제 1 조 목적
이 약관은 컴뷰어스에서 운영하는 ComViewers.com 인터넷사이트(이하 "컴뷰어스") 회원 약관에 관한 것으로 회원 및 비회원을 대상으로 하며, 컴뷰어스가 운영하는 인터넷 관련 서비스(이하 "서비스")를 합리적으로 이용함에 있어, 컴뷰어스와 컴뷰어스 인터넷 사이트를 가입한 회원의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.`;

export default function ShopApplicationPage({ onHome }: ShopApplicationPageProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (agreed) setSubmitted(true);
  }

  return <div className="application-page">
    <ShopHeader onHome={onHome} />
    <main className="application-page__main">
      <form className="application-card" onSubmit={handleSubmit}>
        <header className="application-card__intro"><h1>입점신청</h1><p>ComViewers와 함께 RCPC 서비스를 운영할 서버실 파트너를 모집합니다.<br />입점에 필요한 정보를 제출해 주시면 검토 후 안내드리겠습니다.</p></header>
        <ApplicationSection title="사업자 정보">
          <FieldLabel label="상호명" required><UnderlineInput name="businessName" placeholder="사업자등록증에 기재된 상호명" required /></FieldLabel>
          <FieldLabel label="사업자등록번호" required><UnderlineInput name="businessNumber" placeholder="000-00-00000" inputMode="numeric" required /></FieldLabel>
          <FieldLabel label="대표자명" required><UnderlineInput name="representativeName" placeholder="대표자명 입력" required /></FieldLabel>
        </ApplicationSection>
        <ApplicationSection title="담당자 정보">
          <FieldLabel label="담당자명" required><UnderlineInput name="managerName" placeholder="담당자명 입력" required /></FieldLabel>
          <FieldLabel label="부서 또는 직책"><UnderlineInput name="role" placeholder="매니저" /></FieldLabel>
          <FieldLabel label="E-mail" required><span className="application-email"><UnderlineInput name="emailLocal" placeholder="이메일" required /><b>@</b><UnderlineInput name="emailDomain" aria-label="이메일 도메인" required /><UnderlineSelect name="emailPreset" aria-label="이메일 도메인 선택" defaultValue=""><option value="">이메일 선택</option><option value="naver.com">naver.com</option><option value="gmail.com">gmail.com</option></UnderlineSelect></span></FieldLabel>
          <FieldLabel label="핸드폰"><span className="application-phone"><UnderlineSelect name="phonePrefix" aria-label="휴대전화 앞자리" defaultValue="010"><option>010</option><option>011</option><option>016</option></UnderlineSelect><UnderlineInput name="phoneMiddle" aria-label="휴대전화 가운데 자리" inputMode="numeric" /><UnderlineInput name="phoneLast" aria-label="휴대전화 마지막 자리" inputMode="numeric" /></span></FieldLabel>
        </ApplicationSection>
        <ApplicationSection title="서버실 정보">
          <FieldLabel label="서버실명" required><UnderlineInput name="serverRoomName" placeholder="서버실명 입력" required /></FieldLabel>
          <FieldLabel label="상담 매니저" required><span className="application-manager"><UnderlineSelect name="consultant" defaultValue=""><option value="">매니저 선택</option><option value="consultant-a">담당 매니저 A</option></UnderlineSelect><UnderlineInput name="consultantName" aria-label="상담 매니저 이름" /></span></FieldLabel>
        </ApplicationSection>
        <section className="application-attachments" aria-labelledby="attachments-title"><h2 id="attachments-title">증빙서류 첨부</h2><p>* 사업자등록증(필수), 통장사본(필수) 등 증빙서류를 첨부해 주세요.<br />* JPG, PNG, PDF 파일 · 5개 이하 · 최대 10MB</p><label className="application-upload"><span>파일 선택</span><input type="file" multiple accept="image/jpeg,image/png,application/pdf" /></label></section>
        <section className="application-terms"><label className="application-consent"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>[필수] 입점 약관 동의</span></label><textarea readOnly aria-label="입점 약관 내용" value={termsText} /></section>
        <button className="application-submit" type="submit" disabled={!agreed}>{submitted ? "입점신청이 접수되었습니다" : "입점신청"}</button>
      </form>
    </main>
    <ShopFooter />
  </div>;
}

function ApplicationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="application-section"><h2>{title}</h2><div className="application-section__fields">{children}</div></section>;
}

function ShopHeader({ onHome }: { onHome: () => void }) {
  return <header className="application-header"><div className="application-header__utility"><div><span>게임부터 작업까지, 원하는 PC 환경을 RCPC로 간편하게</span><nav><a href="#cart">장바구니 <b>24</b></a><a href="#login">로그인</a><a href="#signup">회원가입</a></nav></div></div><div className="application-header__navigation"><button className="application-logo" type="button" onClick={onHome} aria-label="ComViewers 홈"><img src="/assets/logo-header.png" alt="ComViewers" /></button><nav aria-label="주요 메뉴"><a href="#products">RCPC상품</a><a href="#room">RCPC방</a><a href="#server">젠서버</a><a href="#parts">파트상품</a><a href="#community">커뮤니티</a></nav></div></header>;
}

function ShopFooter() {
  return <footer className="application-footer"><div className="application-footer__inner"><nav><a href="#company">회사소개</a><a href="#shop-application">입점신청</a></nav><img src="/assets/logo-header.png" alt="ComViewers" /><div className="application-footer__info"><div><p><strong>회사명</strong> (주)아이알씨코리아 <i /> <strong>대표자명</strong> 최주호 <i /> <strong>사업자등록번호</strong> 821-88-01743　<u>[사업자정보확인]</u></p><p><strong>통신판매업신고번호</strong> 2022-강원원주-1569　 <strong>개인정보보호책임자</strong> 최주호, 전민경　 <strong>호스팅제공자</strong> (주)아이알씨코리아</p><p><strong>주소</strong> 강원도 원주시 황금로 2, 5층 401호　 <strong>연락처</strong> 010-8342-1326　 <strong>이메일</strong> counter2017@naver.com</p></div><p className="application-footer__support"><strong>고객센터</strong> 운영시간 <em>평일 11:00 ~ 19:00 (점심시간 13:00 ~ 14:00)</em><br /><u>1:1 문의하기</u>　|　<u>텔레그램 상담</u>　|　<u>카카오톡ID 복사</u></p></div><div className="application-footer__bottom"><span>서비스 이용약관　<strong>개인정보처리방침</strong></span><span>Copyright © ComViewers.com All rights reserved.</span></div></div></footer>;
}
