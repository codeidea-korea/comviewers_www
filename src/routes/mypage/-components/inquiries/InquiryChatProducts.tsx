import type { ReactNode } from 'react'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import backChevron from '@/assets/figma/chevron-left.svg'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import type { MyRcpcItem } from '@/api/myRcpc'
import { toInquiryChoice } from '../inquiryChoice'

type ChatTarget = Awaited<ReturnType<InquiryReadServices['chat']>>['operationRequest']['targets'][number]

export function InquiryChatProducts({ targets, status, standalone, onBack, onClose, onSelect, children, rcpcItems = [] }: {
  children?: ReactNode
  rcpcItems?: readonly MyRcpcItem[]
  targets: readonly ChatTarget[]
  status: string
  standalone: boolean
  onBack: () => void
  onClose: () => void
  onSelect: (productNo: string) => void
}) {
  return <section aria-label="문의 상품" aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-chat-products ${standalone ? 'inquiry-chat' : 'inquiry-product-modal is-detail'}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
    <header className="inquiry-product-modal__header">
      <button aria-label="문의 채팅으로 돌아가기" className="inquiry-product-modal__back" onClick={onBack} type="button"><img alt="" src={backChevron}/></button>
      <h2>문의 상품 ({targets.length})</h2>
      <button aria-label="닫기" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose}/></button>
    </header>
    <div className="inquiry-chat-products__list">
      {children}
      {targets.map((target, index) => {
        const item = rcpcItems.find(item => item.pcAssetId === target.pcAssetId)
        const details = item ? toInquiryChoice(item) : undefined
        return <article key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`}><div>
          <header><em>[{status}]</em><button disabled={!target.productNo} onClick={() => target.productNo && onSelect(target.productNo)} type="button">{target.alias ? `${target.alias} · ` : ''}{target.productNo ?? '상품 정보 없음'}</button><span>{target.serverRoomName ?? '서버실 정보 없음'}</span></header>
          <p>{details?.spec ?? '상품 사양을 확인할 수 없습니다.'}</p><small>주문일 {details?.orderDate ?? '-'}　이용기간 {details?.period ?? '-'}</small>
        </div></article>
      })}
    </div>
  </section>
}
