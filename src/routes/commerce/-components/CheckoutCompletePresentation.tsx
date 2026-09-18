import type { ReactNode } from 'react'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { InfoTable, PageTitle, SectionTitle } from '../CommerceComponents'

export interface CheckoutCompleteProduct {
  key: string
  title: string
  productNo: string
  serverRoom: string
  spec: string
  specLabel: 'PC사양' | '기본 설명'
  availability?: string
  monthlyRentalFee?: string
  usagePeriod: string
}

interface Props {
  title: '주문완료' | '결제완료' | '주문 결과'
  products: readonly CheckoutCompleteProduct[]
  paymentRows: readonly (readonly [string, ReactNode])[]
  contactRows: readonly (readonly [string, ReactNode])[]
  receiptRows?: readonly (readonly [string, ReactNode])[]
  showRemoteInfo: boolean
}

function CompleteProductTable({ product }: { product: CheckoutCompleteProduct }) {
  return <dl className="commerce-info-table complete-product-table">
    <div className="complete-product-table__heading"><dt><span>품번</span><strong className="complete-product-table__title">{product.productNo}</strong></dt><dd><span className="sr-only">관리 서버실</span>{product.serverRoom}</dd></div>
    <div><dt>{product.specLabel}</dt><dd>{product.spec}</dd></div>
    {product.monthlyRentalFee ? <div><dt>월 렌탈료</dt><dd>{product.monthlyRentalFee}</dd></div> : null}
    <div><dt>이용기간</dt><dd>{product.usagePeriod}</dd></div>
  </dl>
}

export function CheckoutCompletePresentation({ title, products, paymentRows, contactRows, receiptRows, showRemoteInfo }: Props) {
  return <>
    <div className="complete-heading">
      {title !== '주문 결과' ? <svg aria-hidden="true" className="complete-heading__check" fill="none" viewBox="0 0 32 32"><path d="m4 16 8 8L28 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg> : null}
      <PageTitle>{title}</PageTitle>
    </div>
    <section><SectionTitle>주문정보</SectionTitle>{products.map(product => <CompleteProductTable key={product.key} product={product} />)}
      {showRemoteInfo ? <><RelativeLink className="order-detail-link" to="/mypage/rcpc">원격 접속 정보 확인하기 ›</RelativeLink><p className="commerce-help">보안을 위해 원격 접속 정보는 마이페이지에서 확인해 주세요.</p></> : null}
    </section>
    <section id="payment"><SectionTitle>결제정보</SectionTitle><InfoTable className="complete-detail-table" rows={paymentRows} /></section>
    <section><SectionTitle>주문자 정보</SectionTitle><InfoTable className="complete-detail-table" rows={contactRows} /></section>
    {receiptRows?.length ? <section><SectionTitle>현금영수증</SectionTitle><InfoTable className="complete-detail-table" rows={receiptRows} /></section> : null}
    <div className="complete-actions"><RelativeLink to="/mypage/rcpc">내 RCPC 관리하기</RelativeLink><RelativeLink to="/products">상품 더 둘러보기</RelativeLink></div>
  </>
}
