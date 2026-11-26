import { useState } from 'react'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import { Button } from '../ui/ButtonControl'
import { Modal } from '../ui/ModalControl'
import { Toast, useToastMessage } from '../ui/ToastControl'
import logoGray from '../../assets/figma/logo-gray.png'
import { footerMenuItems } from '../../navigation/menuItems'
import { TranslatedText, useTranslation, type TranslationKey } from '../../i18n/translation'
import './mobile-footer.css'

const companyInfoRows: ReadonlyArray<ReadonlyArray<readonly [TranslationKey, string, TranslationKey?]>> = [
  [
    ['shell.companyName', '', 'shell.companyRegisteredName'],
    ['shell.representative', '최주호'],
    ['shell.businessNumber', '821-88-01743'],
  ],
  [
    ['shell.onlineBusinessNumber', '2022-강원원주-1569'],
    ['shell.privacyOfficer', '최주호, 전민경'],
    ['shell.hostingProvider', '', 'shell.companyRegisteredName'],
  ],
  [
    ['shell.address', '', 'shell.companyAddress'],
    ['shell.phone', '010-8342-1326'],
    ['shell.email', 'counter2017@naver.com'],
  ],
]

export function Footer({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { locale, t } = useTranslation()
  const { message: copyMessage, setMessage: setCopyMessage, toastKey } = useToastMessage()
  const [telegramOpen, setTelegramOpen] = useState(false)
  const [telegramCopyMessage, setTelegramCopyMessage] = useState<TranslationKey | null>(null)
  const translatedCopyMessage = copyMessage === 'shell.copied' || copyMessage === 'shell.kakaoCopyFailed' ? t(copyMessage) : ''
  const [telegramHintBefore, telegramHintAfter] = t('shell.telegramHint').split('{id}')

  async function copyKakaoId() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText('PCUV7')
      setCopyMessage('shell.copied')
    } catch {
      setCopyMessage('shell.kakaoCopyFailed')
    }
  }

  async function copyTelegramId() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText('@PCUV7')
      setTelegramCopyMessage('shell.telegramCopied')
    } catch {
      setTelegramCopyMessage('shell.telegramCopyFailed')
    }
  }

  return (
    <footer lang={locale} className={`site-footer${variant === 'compact' ? ' site-footer--compact' : ''}`}>
      <div className="site-footer__inner">
        <nav aria-label={t('shell.companyMenu')} className="site-footer__menu">
          {footerMenuItems.map((item) => <Link key={item.id} to={item.href}>{item.id === 'company' ? <TranslatedText id="nav.company" /> : item.id === 'support' ? <TranslatedText id="nav.support" /> : item.id === 'colocation' ? <TranslatedText id="shell.colocation" /> : item.label}</Link>)}
        </nav>
        <img alt="ComViewers" className="site-footer__logo" src={logoGray} />
        <div className="site-footer__content">
          <address className="site-footer__company-info">
            {companyInfoRows.map((row, rowIndex) => (
              <div className="site-footer__company-row" key={rowIndex}>
                {row.map(([label, value, valueKey]) => (
                  <span key={label}>
                    <strong><TranslatedText id={label} /></strong>
                    {valueKey ? <TranslatedText id={valueKey} /> : <span className="notranslate" translate="no">{value}</span>}
                    {label === 'shell.businessNumber' ? (
                      <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8218801743" rel="noreferrer" target="_blank"><TranslatedText id="shell.verifyBusiness" /></a>
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </address>
          <div className="site-footer__support">
            <strong><TranslatedText id="nav.support" /></strong>
            <div>
              <p className="notranslate" translate="no">{t('shell.businessHours')} <span>{t('shell.businessSchedule')}</span></p>
              <nav aria-label={t('shell.supportMethods')}>
                <Link to="/mypage/inquiries"><TranslatedText id="shell.inquiry" /></Link>
                <button onClick={() => { setTelegramCopyMessage(null); setTelegramOpen(true) }} type="button"><TranslatedText id="shell.telegramSupport" /></button>
                <button onClick={copyKakaoId} type="button"><TranslatedText id="shell.copyKakao" /></button>
              </nav>
            </div>
          </div>
        </div>
        <div className="site-footer__bottom">
          <div><Link to="/terms"><TranslatedText id="legal.termsTitle" /></Link><Link className="site-footer__privacy" to="/privacy"><TranslatedText id="legal.privacyTitle" /></Link></div>
          <p>Copyright © ComViewers.com All rights reserved.</p>
        </div>
      </div>
      <Toast message={translatedCopyMessage} toastKey={toastKey} />
      <Modal className="modal--telegram-support" isOpen={telegramOpen} onClose={() => setTelegramOpen(false)} title="텔레그램 상담" titleTranslationKey="shell.telegramSupport">
        <p><TranslatedText id="shell.chooseSupport" /></p>
        <div className="telegram-support__actions">
          <Button as="a" href="https://t.me/PCUV7" rel="noreferrer" size="large" target="_blank"><TranslatedText id="shell.telegramApp" /></Button>
          <Button as="a" href="https://web.telegram.org/" rel="noreferrer" size="large" target="_blank" variant="secondary"><TranslatedText id="shell.telegramWeb" /></Button>
        </div>
        <p className="telegram-support__hint notranslate" translate="no">{telegramHintBefore}<strong>@PCUV7</strong>{telegramHintAfter}</p>
        <Button onClick={() => void copyTelegramId()} size="small" variant="outline-dark"><TranslatedText id="shell.copyTelegram" /></Button>
        <p aria-live="polite" className="telegram-support__message notranslate" translate="no">{telegramCopyMessage ? t(telegramCopyMessage) : ''}</p>
      </Modal>
    </footer>
  )
}
