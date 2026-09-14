import { useState } from 'react'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import logoGray from '../../assets/figma/logo-gray.png'
import { footerMenuItems } from '../../navigation/menuItems'

const companyInfoRows: ReadonlyArray<ReadonlyArray<readonly [string, string]>> = [
  [
    ['회사명', '(주)아이알씨코리아'],
    ['대표자명', '최주호'],
    ['사업자등록번호', '821-88-01743'],
  ],
  [
    ['통신판매업신고번호', '2022-강원원주-1569'],
    ['개인정보보호책임자', '최주호, 전민경'],
    ['호스팅제공자', '(주)아이알씨코리아'],
  ],
  [
    ['주소', '강원도 원주시 황금로 2, 5층 401호'],
    ['연락처', '010-8342-1326'],
    ['이메일', 'counter2017@naver.com'],
  ],
]

export function Footer() {
  const [copyMessage, setCopyMessage] = useState('')

  async function copyKakaoId() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText('PCUV7')
      setCopyMessage('카카오톡 ID PCUV7이 복사되었습니다.')
    } catch {
      setCopyMessage('복사할 수 없습니다. 카카오톡 ID PCUV7을 직접 입력해 주세요.')
    }
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav aria-label="회사 정보 메뉴" className="site-footer__menu">
          {footerMenuItems.map((item) => <Link key={item.id} to={item.href}>{item.label}</Link>)}
        </nav>
        <img alt="ComViewers" className="site-footer__logo" src={logoGray} />
        <div className="site-footer__content">
          <address className="site-footer__company-info">
            {companyInfoRows.map((row, rowIndex) => (
              <div className="site-footer__company-row" key={rowIndex}>
                {row.map(([label, value]) => (
                  <span key={label}>
                    <strong>{label}</strong>
                    {value}
                    {label === '사업자등록번호' ? (
                      <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8218801743" rel="noreferrer" target="_blank">[사업자정보확인]</a>
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </address>
          <div className="site-footer__support">
            <strong>고객센터</strong>
            <div>
              <p>운영시간 <span>평일 11:00 ~ 19:00 (점심시간 13:00 ~ 14:00)</span></p>
              <nav aria-label="고객센터 문의 방법">
                <Link to="/mypage/inquiries">1:1 문의하기</Link>
                <a href="https://t.me/PCUV7" rel="noreferrer" target="_blank">텔레그램 상담</a>
                <button onClick={copyKakaoId} type="button">카카오톡ID 복사</button>
              </nav>
              <p aria-live="polite" className="sr-only">{copyMessage}</p>
            </div>
          </div>
        </div>
        <div className="site-footer__bottom">
          <div><Link to="/terms">서비스 이용약관</Link><Link className="site-footer__privacy" to="/privacy">개인정보처리방침</Link></div>
          <p>Copyright © ComViewers.com All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
