import type { ReactNode, RefObject } from 'react'
import type { InquiryComposer, InquiryTarget } from './inquiryFlowTypes'
interface WritePopupProps { backdropClassName?: string; children: ReactNode; onClose: () => void; returnFocusRef?: RefObject<HTMLElement | null> }
interface WriteContentProps { complete?: boolean; composer?: InquiryComposer; inquiryType?: string; onAddProduct?: () => void; onBack?: () => void; onClose?: () => void; onViewProducts?: () => void; selectedRcpcs?: readonly InquiryTarget[] }
import { useState } from 'react'
import inquiryPhoto from '../../assets/figma/inquiry-attachment.jpeg'
import productThumb from '../../assets/figma/windows-card-render.png'
import addIcon from '../../assets/figma/icon-add.svg'
import moreVertical from '../../assets/figma/comment-more-fill.svg'
import modalClose from '../../assets/figma/inquiry-modal-close.svg'
import { DialogLayer } from '../ui/DialogLayerControl'

const defaultRcpcs = [{ alias: '컴퓨컴퓨1', rcpcId: '89023', selectionId: 'inquiry-default-89023' }]

export function InquiryWritePopup({ backdropClassName, children, onClose, returnFocusRef }: WritePopupProps) {
  return <DialogLayer asChild backdropClassName={backdropClassName} focusKey="create:write" isOpen onClose={onClose} returnFocusRef={returnFocusRef} showTitle={false} title="문의 작성">{children}</DialogLayer>
}

export function InquiryWriteContent({ complete = false, composer, inquiryType = '변경·교체·추가 요청', onAddProduct, onBack, onClose = () => {}, onViewProducts, selectedRcpcs = defaultRcpcs }: WriteContentProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [localMessage, setLocalMessage] = useState('')
  const [localSentMessages, setLocalSentMessages] = useState<string[]>([])
  const message = composer?.message ?? localMessage
  const sentMessages = composer?.sentMessages ?? localSentMessages
  const setMessage = composer?.onMessageChange ?? setLocalMessage
  const sendMessage = () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || complete) return
    if (composer) { composer.onSend(); return }
    setLocalSentMessages((current) => [...current, trimmedMessage])
    setMessage('')
  }
  const selectMenuItem = (action: () => void) => {
    setMenuOpen(false)
    action()
  }
  return (
    <section aria-modal="true" className={`inquiry-preview-dialog inquiry-chat${complete ? ' inquiry-chat--complete' : ''}`} role="dialog" tabIndex={-1}>
      <header><button aria-expanded={menuOpen} aria-label="문의 메뉴" onClick={() => setMenuOpen((open) => !open)} type="button"><img alt="" className="inquiry-chat__icon" src={moreVertical} /></button><h2>{complete ? '[처리완료]' : '[접수]'} {inquiryType}</h2><button aria-label="닫기" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose} /></button></header>
      {menuOpen ? <div className="inquiry-chat__menu" role="menu">{onBack ? <button onClick={() => selectMenuItem(onBack)} role="menuitem" type="button">문의 유형 변경</button> : null}{onAddProduct ? <button onClick={() => selectMenuItem(onAddProduct)} role="menuitem" type="button">문의 상품 추가</button> : null}{onViewProducts ? <button onClick={() => selectMenuItem(onViewProducts)} role="menuitem" type="button">문의 상품</button> : null}</div> : null}
      <div className="inquiry-chat__scroll">
        <time>2026.07.05</time>
        {selectedRcpcs.length > 1 ? <p className="inquiry-chat__bulk-summary">선택한 RCPC {selectedRcpcs.length}대 일괄 문의</p> : null}
        {selectedRcpcs.map((rcpc) => <article className="inquiry-chat__product" data-order-id={rcpc.orderId} data-rcpc-id={rcpc.rcpcId} data-selection-id={rcpc.selectionId} key={rcpc.selectionId}><span>17:50</span><img alt="RCPC 상품" src={productThumb} /><div><small>{rcpc.rcpcId}</small><b>{rcpc.alias}</b><em>{rcpc.location ?? 'IRC코리아/메가서버실'}</em></div></article>)}
        <p className="inquiry-chat__mine">현재 사용 중인 IP 대역 변경 및 노후 장비 교체를 요청드립니다. 서버실 내 스위치 2대와 공인 IP 3개 교체가 필요합니다.</p>
        <img alt="문의 첨부 이미지" className="inquiry-chat__photo" src={inquiryPhoto} />
        {complete ? <p className="inquiry-chat__system">사무실용_89023이 추가되었습니다.</p> : null}
        <p className="inquiry-chat__sender">본사 담당자</p><p className="inquiry-chat__reply">본사 담당자 답변입니다.</p>
        <p className="inquiry-chat__sender">서버실 담당자</p><p className="inquiry-chat__reply">서버실 담당자 답변입니다.</p>
        {sentMessages.map((sentMessage, index) => <p className="inquiry-chat__mine inquiry-chat__mine--sent" key={`${sentMessage}-${index}`}>{sentMessage}</p>)}
      </div>
      <footer><img alt="" src={addIcon} /><input aria-label="문의 메시지" disabled={complete} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage() }} placeholder="메시지를 입력해 주세요." value={message} /><button disabled={complete || !message.trim()} onClick={sendMessage} type="button">전송</button></footer>
    </section>
  )
}
