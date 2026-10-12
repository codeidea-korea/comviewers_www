import type { ReactNode } from 'react'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import backChevron from '@/assets/figma/chevron-left.svg'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import productThumb from '@/assets/figma/windows-card-render.png'

type ChatTarget = Awaited<ReturnType<InquiryReadServices['chat']>>['operationRequest']['targets'][number]

export function InquiryChatProducts({ targets, standalone, onBack, onClose, onSelect, children }: {
  children?: ReactNode
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
      {targets.map((target, index) => <article key={`${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`}>
        <img alt="RCPC 상품" src={productThumb}/>
        <div><button disabled={!target.productNo} onClick={() => target.productNo && onSelect(target.productNo)} type="button">{target.productNo ?? '상품 정보 없음'}</button>
          {target.alias ? <strong>{target.alias}</strong> : null}<span>{target.serverRoomName ?? '서버실 정보 없음'}</span></div>
      </article>)}
    </div>
    {children}
  </section>
}
