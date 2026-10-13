import type { ReactNode } from 'react'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import backChevron from '@/assets/figma/mypage-mobile-back.png'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import type { MyRcpcItem } from '@/api/myRcpc'
import { toInquiryChoice } from '../inquiryChoice'
import { RcpcStatusContents } from '../rcpc/RcpcStatusContents'

type ChatTarget = Awaited<ReturnType<InquiryReadServices['chat']>>['operationRequest']['targets'][number]

export function InquiryChatProducts({ targets, standalone, onBack, onClose, onSelect, children, rcpcItems = [] }: {
  children?: ReactNode
  rcpcItems?: readonly MyRcpcItem[]
  targets: readonly ChatTarget[]
  standalone: boolean
  onBack: () => void
  onClose: () => void
  onSelect: (productNo: string) => void
}) {
  return <section aria-label="문의 상품" aria-modal={standalone ? undefined : true} className="inquiry-preview-dialog inquiry-chat inquiry-chat-products" role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
    <header>
      <button aria-label="문의 채팅으로 돌아가기" onClick={onBack} type="button"><img alt="" src={backChevron}/></button>
      <h2>문의 상품 ({targets.length})</h2>
      {!standalone ? <button aria-label="닫기" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose}/></button> : null}
    </header>
    <div className="inquiry-chat-products__list">
      {targets.map((target, index) => {
        const item = rcpcItems.find(item => item.pcAssetId === target.pcAssetId)
        const details = item ? toInquiryChoice(item) : undefined
        return <article key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`}><div>
          <header>{item ? <em><RcpcStatusContents item={item}/></em> : null}<button disabled={!target.productNo} onClick={() => target.productNo && onSelect(target.productNo)} type="button">{target.alias ? `${target.alias} · ` : ''}{target.productNo ?? '상품 정보 없음'}</button><span>{target.serverRoomName ?? '서버실 정보 없음'}</span></header>
          <p>{details?.spec ?? '상품 사양을 확인할 수 없습니다.'}</p><small>주문일 {details?.orderDate ?? '-'}　이용기간 {details?.period ?? '-'}</small>
        </div></article>
      })}
    </div>
    {children}
  </section>
}
