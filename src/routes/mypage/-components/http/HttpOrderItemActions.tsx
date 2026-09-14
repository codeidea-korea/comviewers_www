import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountOrderItem } from '@/api/myAccountOrders'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { OrderPurchaseConfirmDialog } from '@/components/mypage/OrderDialogsControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { accountDate } from './AccountReadCommon'
import { HttpOrderReview } from './HttpOrderReview'
import { useServices } from '@/app/ServiceProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { PartPurchaseActions } from './PartPurchaseActions'
import { InquiryRefundApplication } from '../InquiryRefundApplication'
import { InquiryCreateDialog } from '../InquiryCreateDialog'

export function HttpOrderItemActions({ api, item, paymentStatus, orderStatus, variant = 'default' }: { api: MyAccountReadServices; item: AccountOrderItem; paymentStatus: string; orderStatus: string; variant?: 'default' | 'purchase-summary' }) {
  const { myAccount } = useServices()
  const [open, setOpen] = useState(false)
  const [key] = useState(() => crypto.randomUUID())
  const busy = useRef(false)
  const client = useQueryClient()
  const confirmation = useMutation({ mutationFn: () => api.confirmPurchase(item.orderItemId, key), onSuccess: async () => {
    setOpen(false)
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['productReviewEligible', item.productNo] })])
  }, onSettled: () => { busy.current = false } })
  const confirmedAt = confirmation.data?.confirmedAt ?? item.purchaseConfirmedAt
  const paid = !item.refundPending && paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)
  if (terminal) return null
  const reviewDisabled = !terminal
    && (!confirmedAt || item.refundPending)
  const active = paid && ['using', 'replacement_using'].includes(item.customerRentalStatus) && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const canExtend = !item.refundPending
    && paid
    && ['using', 'extension_waiting'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '')
    && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const now = Date.now()
  const canConfirm = active && !confirmedAt && Boolean(item.automaticConfirmationAt && item.serviceStartedAt && item.serviceEndsAt
    && new Date(`${item.serviceStartedAt}+09:00`).getTime() <= now && new Date(`${item.serviceEndsAt}+09:00`).getTime() > now)
  if (variant === 'purchase-summary') return <>
    {canConfirm ? <button type="button" disabled={confirmation.isPending} onClick={() => setOpen(true)}>구매확정 {item.automaticConfirmationAt ? `(자동 구매확정일: ${accountDate(item.automaticConfirmationAt).slice(0, 10)})` : ''}</button> : null}
    {item.expectedPoints !== null ? <b>포인트 {item.expectedPoints.toLocaleString('ko-KR')}P 받기</b> : null}
    <OrderPurchaseConfirmDialog isOpen={open} onClose={() => { if (!confirmation.isPending) setOpen(false) }} confirmLabel={confirmation.isPending ? '처리 중…' : '구매확정하기'} confirmDisabled={confirmation.isPending} error={confirmation.isError ? '구매확정을 처리하지 못했습니다. 최신 주문 상태를 확인한 뒤 다시 시도해 주세요.' : undefined} onConfirm={() => { if (!busy.current) { busy.current = true; confirmation.mutate() } }} points={item.expectedPoints} />
  </>
  if (item.billingUnit === 'unit' && item.durationUnits === null && item.pcAssetId === null && !item.rentalId)
    return paid ? <PartPurchaseActions api={api} item={item}/> : null
  return <div className="order-catalog-item__actions order-item__actions">
    <div className="order-item__service-actions">
      {item.rentalId && !terminal && (canExtend && myAccount.rcpcApi
        ? <RcpcExtensionCheckout api={myAccount.rcpcApi} rentalIds={[Number(item.rentalId)]} displayTargets={[{ rcpcId: item.productNo, cpu: item.title }]} triggerLabel="기간 연장"/>
        : <button type="button" disabled>기간 연장</button>)}
      {confirmedAt && paid && !item.refundPending && <HttpOrderReview item={item} />}
      {reviewDisabled && <button type="button" disabled>후기 작성</button>}
    </div>
    <div className="order-item__confirmation-actions">
      {confirmedAt && <p>구매확정일 {accountDate(confirmedAt).slice(0, 10)}</p>}
      {confirmedAt ? <p>적립 포인트 {(confirmation.data?.accruedPoints ?? item.accruedPoints ?? 0).toLocaleString('ko-KR')}P</p> : item.expectedPoints !== null && <p>구매확정 예상 적립 {item.expectedPoints.toLocaleString('ko-KR')}P</p>}
      {!terminal && item.automaticConfirmationAt && <p>자동 구매확정일 {accountDate(item.automaticConfirmationAt).slice(0, 10)}</p>}
      {!terminal && !item.refundPending && !confirmedAt && <button type="button" disabled={!canConfirm || confirmation.isPending} onClick={() => setOpen(true)}>구매확정하고 포인트 받기</button>}
      {confirmedAt && paid && <button type="button" disabled>구매확정 완료</button>}
    </div>
    {confirmation.data && <p className="order-item__confirmation-message" role="status">구매확정되었습니다. {confirmation.data.accruedPoints.toLocaleString('ko-KR')}포인트가 적립되었습니다.</p>}
    <OrderPurchaseConfirmDialog isOpen={open} onClose={() => { if (!confirmation.isPending) setOpen(false) }} confirmLabel={confirmation.isPending ? '처리 중…' : '구매확정하기'} confirmDisabled={confirmation.isPending} error={confirmation.isError ? '구매확정을 처리하지 못했습니다. 최신 주문 상태를 확인한 뒤 다시 시도해 주세요.' : undefined} onConfirm={() => { if (!busy.current) { busy.current = true; confirmation.mutate() } }} points={item.expectedPoints} />
  </div>
}

export function HttpOrderItemSupportActions({ item, paymentStatus, orderStatus }: { item: AccountOrderItem; paymentStatus: string; orderStatus: string }) {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const paid = paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)
  const active = paid && !item.purchaseConfirmedAt && !item.refundPending && ['using', 'replacement_using'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)

  if (!item.rentalId) return null
  return <div className="order-catalog-item__actions order-item__support-actions">
    {myAccount.inquiryApi && myAccount.rcpcApi
      ? <button type="button" onClick={() => setInquiryOpen(true)}>문의</button>
      : <RelativeLink to={`/mypage/inquiries?productNo=${encodeURIComponent(item.productNo)}`}>문의</RelativeLink>}
    {myAccount.inquiryApi ? <InquiryRefundApplication api={myAccount.inquiryApi} initialRentalIds={[Number(item.rentalId)]} triggerEnabled={active} triggerLabel="해지신청" /> : null}
    {inquiryOpen && myAccount.inquiryApi && myAccount.rcpcApi ? <InquiryCreateDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={item.pcAssetId ? [Number(item.pcAssetId)] : []} initialProductNo={item.pcAssetId ? '' : item.productNo} onClose={() => setInquiryOpen(false)} onCreated={async id => { setInquiryOpen(false); await client.invalidateQueries({ queryKey: ['operation-requests', myAccount.inquiryApi?.organizationId] }); navigate(`/mypage/inquiries/${id}`) }} /> : null}
  </div>
}
