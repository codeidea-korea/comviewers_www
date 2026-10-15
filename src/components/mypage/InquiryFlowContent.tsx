import { useUiTranslation } from '@/i18n/uiTranslation'
import type { ReactNode, RefObject } from 'react'
import type { InquiryComposer, InquiryTarget } from './inquiryFlowTypes'
import { useState } from 'react'
import { InquiryProductsPanel, type InquiryProductDetails } from './InquiryProductsPanel'
import { InquiryChatProductCard } from './InquiryChatProductCard'
import { Button } from '../ui/ButtonControl'
import addIcon from '../../assets/figma/icon-add.svg'
import { InquiryChatMenu, InquiryChatHeader, type InquiryChatMenuAction } from './InquiryChatMenu'
import modalClose from '../../assets/figma/inquiry-modal-close.svg'
import radioOff from '../../assets/figma/select-radio-off.svg'
import radioOn from '../../assets/figma/select-radio-on.svg'
import { DialogLayer } from '../ui/DialogLayerControl'
import { Radio } from '../ui/RadioControl'
import backChevron from '../../assets/figma/chevron-left.svg'

interface FlowPopupProps {
  backdropClassName?: string
  children: ReactNode
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

interface TypeChoiceProps {
  standalone?: boolean
  backLabel?: string
  notice?: ReactNode
  onBack?: () => void
  onClose?: () => void
  onNext?: () => void
  onSelectedChange?: (index: number) => void
  selectedIndex?: number | null
  options?: readonly string[]
}

interface WriteContentProps {
  standalone?: boolean
  onAddProducts?: () => void
  composer: InquiryComposer
  inquiryType: string
  onBack: () => void
  onClose: () => void
  selectedRcpcs: readonly (InquiryTarget & Pick<InquiryProductDetails, 'spec' | 'orderDate' | 'period'>)[]
  submitLabel?: string
}

export const inquiryTypes = ['AS·점검 요청', '변경·교체·추가 요청', '해지신청', '기타 문의']

export function InquiryTypeChoicePopup({ backdropClassName, children, onClose, returnFocusRef }: FlowPopupProps) {
  const { uiText } = useUiTranslation()
  return <DialogLayer asChild backdropClassName={backdropClassName} focusKey="create:select-type" isOpen onClose={onClose} returnFocusRef={returnFocusRef} showTitle={false} title={uiText("문의 유형 선택")}>{children}</DialogLayer>
}

export function TypeChoiceContent({ backLabel = '이전', notice, onBack = () => {}, onClose = () => {}, onNext = () => {}, onSelectedChange = () => {}, options = inquiryTypes, selectedIndex = null, standalone = false }: TypeChoiceProps) {
  const { uiText } = useUiTranslation()
  return (
    <section aria-label={standalone ? uiText("문의 유형 선택") : undefined} aria-modal={standalone ? undefined : true} className="inquiry-preview-dialog inquiry-type-choice" role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <header>
        <button aria-label={(backLabel === '닫기' || backLabel === uiText('닫기')) ? uiText("닫기") : uiText("상품 선택으로 돌아가기")} className="inquiry-flow-back" onClick={onBack} type="button"><img alt="" src={backChevron}/></button><h2>{uiText("문의 유형 선택")}</h2>
        {!standalone ? <button aria-label={uiText("닫기")} onClick={onClose} type="button"><img alt="" src={modalClose} /></button> : null}
      </header>
      <div>{options.map((item, index) => {
        const checked = selectedIndex === index
        return <Radio checked={checked} className={checked ? 'is-selected' : ''} key={item} name="inquiry-type" offIcon={radioOff} onChange={() => onSelectedChange(index)} onIcon={radioOn}>{uiText(item)}</Radio>
      })}</div>
      {notice ? <p className="mypage-notice mypage-notice--error" role="alert">{typeof notice === 'string' ? uiText(notice) : notice}</p> : null}
      <footer className="inquiry-type-choice__actions--single"><button disabled={selectedIndex === null || !options[selectedIndex]} onClick={onNext} type="button">{uiText("문의 접수하기")}</button></footer>
    </section>
  )
}



export function InquiryWritePopup({ backdropClassName, children, onClose, returnFocusRef }: FlowPopupProps) {
  const { uiText } = useUiTranslation()
  return <DialogLayer asChild backdropClassName={backdropClassName} focusKey="create:write" isOpen onClose={onClose} returnFocusRef={returnFocusRef} showTitle={false} title={uiText("문의 작성")}>{children}</DialogLayer>
}

export function InquiryWriteContent({ composer, inquiryType, onBack, onClose, onAddProducts, selectedRcpcs, standalone = false, submitLabel = '초안 저장' }: WriteContentProps) {
  const { uiText, t } = useUiTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const message = composer.message
  const setMessage = composer.onMessageChange
  const submitMessage = () => {
    if (!composer.pending && message.trim()) composer.onSend()
  }
  const addDisabled = Boolean(composer.pending) || selectedRcpcs.length >= 20
  const selectMenuItem = (action: InquiryChatMenuAction) => {
    setMenuOpen(false)
    if (action === 'products') setProductsOpen(true)
    else if (!addDisabled) (onAddProducts ?? onBack)()
  }
  if (productsOpen) return <InquiryProductsPanel
    products={selectedRcpcs.map(rcpc => ({ ...rcpc, key: rcpc.selectionId ?? String(rcpc.rcpcId) }))}
    status={uiText("작성 중")}
    standalone={standalone}
    onBack={() => setProductsOpen(false)}
    onClose={onClose}
  />
  return (
    <section aria-label={standalone ? uiText("문의 작성") : undefined} aria-modal={standalone ? undefined : true} className="inquiry-preview-dialog inquiry-chat" role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
      <InquiryChatHeader title={t("mypageSupport.template11", { value0: uiText(inquiryType) })} standalone={standalone} disabled={composer.pending} open={menuOpen} onToggle={() => setMenuOpen(open => !open)} addDisabled={addDisabled} onSelect={selectMenuItem} onClose={onClose}/>
      <InquiryChatMenu open={menuOpen} onClose={() => setMenuOpen(false)} addDisabled={addDisabled} onSelect={selectMenuItem}/>
      <div className="inquiry-chat__scroll">
        
        {selectedRcpcs.length > 1 ? <p className="inquiry-chat__bulk-summary">{t("mypageSupport.bulkInquiryCount", { count: selectedRcpcs.length })}</p> : null}
        {selectedRcpcs.map((rcpc) => <InquiryChatProductCard data-order-id={rcpc.orderId} data-rcpc-id={rcpc.rcpcId} data-selection-id={rcpc.selectionId} key={rcpc.selectionId ?? String(rcpc.rcpcId)} productNo={rcpc.productNo} alias={rcpc.alias} serverRoomName={rcpc.location}/>)}
        <p className="inquiry-chat__system">{uiText("문의 유형과 대상 RCPC를 확인한 뒤 내용을 작성해 주세요.")}</p>
      </div>
      {composer.notice ? <p role={composer.notice === '문의 초안을 저장했습니다.' ? 'status' : 'alert'} className={`mypage-notice ${composer.notice === '문의 초안을 저장했습니다.' ? 'mypage-notice--success' : 'mypage-notice--error'}`}>{uiText(composer.notice)}</p> : null}
      <form className="inquiry-chat__composer" onSubmit={event => { event.preventDefault(); submitMessage() }}><div className="inquiry-chat__attachments"><img alt="" className="inquiry-chat__draft-attachment-icon" src={addIcon}/></div><label><span className="sr-only">{uiText("새 메시지")}</span><textarea maxLength={4000} readOnly={composer.pending} aria-label={uiText("새 메시지")} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
        event.preventDefault()
        submitMessage()
      }} placeholder={uiText("메시지를 입력해 주세요.")} value={message}/></label><Button disabled={composer.pending || !message.trim()} type="submit">{composer.pending ? uiText("전송 중…") : uiText(submitLabel)}</Button></form>
    </section>
  )
}
