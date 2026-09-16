import type { ReactNode, RefObject } from 'react'
import type { InquiryComposer, InquiryTarget } from './inquiryFlowTypes'
import { useState } from 'react'
import productThumb from '../../assets/figma/windows-card-render.png'
import addIcon from '../../assets/figma/icon-add.svg'
import moreVertical from '../../assets/figma/comment-more-fill.svg'
import modalClose from '../../assets/figma/inquiry-modal-close.svg'
import radioOff from '../../assets/figma/select-radio-off.svg'
import radioOn from '../../assets/figma/select-radio-on.svg'
import { DialogLayer } from '../ui/DialogLayerControl'
import { Radio } from '../ui/RadioControl'

interface FlowPopupProps {
  backdropClassName?: string
  children: ReactNode
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

interface TypeChoiceProps {
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
  composer: InquiryComposer
  inquiryType: string
  onBack: () => void
  onClose: () => void
  selectedRcpcs: readonly InquiryTarget[]
  submitLabel?: string
}

export const inquiryTypes = ['AS·점검 요청', '변경·교체·추가 요청', '해지신청', '기타 문의']

export function InquiryTypeChoicePopup({ backdropClassName, children, onClose, returnFocusRef }: FlowPopupProps) {
  return <DialogLayer asChild backdropClassName={backdropClassName} focusKey="create:select-type" isOpen onClose={onClose} returnFocusRef={returnFocusRef} showTitle={false} title="문의 유형 선택">{children}</DialogLayer>
}

export function TypeChoiceContent({ backLabel = '이전', notice, onBack = () => {}, onClose = () => {}, onNext = () => {}, onSelectedChange = () => {}, options = inquiryTypes, selectedIndex = null }: TypeChoiceProps) {
  return (
    <section aria-modal="true" className="inquiry-preview-dialog inquiry-type-choice" role="dialog" tabIndex={-1}>
      <header>
        <h2>문의 유형 선택</h2>
        <button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={modalClose} /></button>
      </header>
      <div>{options.map((item, index) => {
        const checked = selectedIndex === index
        return <Radio checked={checked} className={checked ? 'is-selected' : ''} key={item} name="inquiry-type" offIcon={radioOff} onChange={() => onSelectedChange(index)} onIcon={radioOn}>{item}</Radio>
      })}</div>
      {notice ? <p className="mypage-notice" role="alert">{notice}</p> : null}
      <footer><button onClick={onBack} type="button">{backLabel}</button><button disabled={selectedIndex === null || !options[selectedIndex]} onClick={onNext} type="button">문의 접수하기</button></footer>
    </section>
  )
}



export function InquiryWritePopup({ backdropClassName, children, onClose, returnFocusRef }: FlowPopupProps) {
  return <DialogLayer asChild backdropClassName={backdropClassName} focusKey="create:write" isOpen onClose={onClose} returnFocusRef={returnFocusRef} showTitle={false} title="문의 작성">{children}</DialogLayer>
}

export function InquiryWriteContent({ composer, inquiryType, onBack, onClose, selectedRcpcs, submitLabel = '초안 저장' }: WriteContentProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const message = composer.message
  const setMessage = composer.onMessageChange
  const selectMenuItem = (action: () => void) => {
    setMenuOpen(false)
    action()
  }
  return (
    <section aria-modal="true" className="inquiry-preview-dialog inquiry-chat" role="dialog" tabIndex={-1}>
      <header><button aria-expanded={menuOpen} aria-label="문의 메뉴" onClick={() => setMenuOpen((open) => !open)} type="button"><img alt="" className="inquiry-chat__icon" src={moreVertical} /></button><h2>[작성 중] {inquiryType}</h2><button aria-label="닫기" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose} /></button></header>
      {menuOpen ? <div className="inquiry-chat__menu" role="menu">{onBack ? <button onClick={() => selectMenuItem(onBack)} role="menuitem" type="button">문의 유형 변경</button> : null}</div> : null}
      <div className="inquiry-chat__scroll">
        
        {selectedRcpcs.length > 1 ? <p className="inquiry-chat__bulk-summary">선택한 RCPC {selectedRcpcs.length}대 일괄 문의</p> : null}
        {selectedRcpcs.map((rcpc) => <article className="inquiry-chat__product" data-order-id={rcpc.orderId} data-rcpc-id={rcpc.rcpcId} data-selection-id={rcpc.selectionId} key={rcpc.selectionId ?? String(rcpc.rcpcId)}><span>선택 품목</span><img alt="RCPC 상품" src={productThumb} /><div><small>{rcpc.rcpcId}</small><b>{rcpc.alias}</b><em>{rcpc.location ?? '서버실 정보 없음'}</em></div></article>)}
        <p className="inquiry-chat__system">문의 유형과 대상 RCPC를 확인한 뒤 내용을 작성해 주세요.</p>
      </div>
      {composer.notice ? <p role={composer.notice === '문의 초안을 저장했습니다.' ? 'status' : 'alert'} className={`mypage-notice${composer.notice === '문의 초안을 저장했습니다.' ? '' : ' mypage-notice--error'}`}>{composer.notice}</p> : null}
      <footer><img alt="" src={addIcon} /><input maxLength={4000} disabled={composer.pending} aria-label="문의 메시지" onChange={(event) => setMessage(event.target.value)} placeholder="메시지를 입력해 주세요." value={message} /><button disabled={composer.pending || !message.trim()} onClick={composer.onSend} type="button">{composer.pending ? '처리 중…' : submitLabel}</button></footer>
    </section>
  )
}
