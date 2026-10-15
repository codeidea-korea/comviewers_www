import { useUiTranslation } from '@/i18n/uiTranslation'
import type { ReactNode } from 'react'
import backChevron from '@/assets/figma/chevron-left.svg'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import './inquiry-products-panel.css'

export interface InquiryProductDetails {
  key: string
  productNo?: string | null
  alias?: string | null
  location?: string | null
  spec?: string
  orderDate?: string
  period?: string
}

export function InquiryProductsPanel({ products, status, standalone, onBack, onClose, onSelect, children }: {
  products: readonly InquiryProductDetails[]
  status: string
  standalone: boolean
  onBack: () => void
  onClose: () => void
  onSelect?: (productNo: string) => void
  children?: ReactNode
}) {
  const { uiText, t } = useUiTranslation()
  return <section aria-label={uiText("문의 상품")} aria-modal={standalone ? undefined : true} className={`inquiry-preview-dialog inquiry-chat-products ${standalone ? 'inquiry-chat' : 'inquiry-product-modal is-detail'}`} role={standalone ? undefined : 'dialog'} tabIndex={standalone ? undefined : -1}>
    <header className="inquiry-product-modal__header">
      <button aria-label={uiText("문의 채팅으로 돌아가기")} className="inquiry-product-modal__back" onClick={onBack} type="button"><img alt="" src={backChevron}/></button>
      <h2>{t("mypageSupport.inquiryProductCount", { count: products.length })}</h2>
      <button aria-label={uiText("닫기")} className="inquiry-chat__close" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose}/></button>
    </header>
    <div className="inquiry-chat-products__list">
      {children}
      {products.map(product => {
        const title = `${product.alias ? `${product.alias} · ` : ''}${product.productNo ?? uiText("상품 정보 없음")}`
        return <article key={product.key}><div>
          <header><em>[{uiText(status)}]</em>{onSelect ? <button disabled={!product.productNo} onClick={() => product.productNo && onSelect(product.productNo)} type="button">{title}</button> : <strong>{title}</strong>}<span>{product.location === "서버실 정보 없음" ? uiText("서버실 정보 없음") : product.location ?? uiText("서버실 정보 없음")}</span></header>
          <p>{product.spec === "PC 사양 정보 없음" ? uiText(product.spec) : product.spec ?? uiText("상품 사양을 확인할 수 없습니다.")}</p><small>{uiText("주문일")} {product.orderDate ?? '-'}　{uiText("이용기간")} {product.period ?? '-'}</small>
        </div></article>
      })}
    </div>
  </section>
}
