import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail, AccountOrderItem } from '@/api/myAccountOrders'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { OrderPurchaseConfirmDialog } from '@/components/mypage/OrderDialogsControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import { accountDate } from '../shared/AccountReadCommon'
import { OrderReview } from './OrderReview'
import { useServices } from '@/app/ServiceProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { PartPurchaseActions } from './PartPurchaseActions'
import { InquiryRefundApplication } from '../InquiryRefundApplication'
import { InquiryCreateDialog } from '../InquiryCreateDialog'
import { Button } from '@/components/ui/ButtonControl'
import { RefundWithdrawalAction } from './RefundWithdrawalAction'
import tollIcon from '@/assets/figma/icon-toll.svg'

export function OrderItemActions({ api, item, orderNo, paymentStatus, orderStatus, orderDetail, variant = 'default' }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; paymentStatus: string; orderStatus: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; variant?: 'default' | 'purchase-summary' | 'dashboard' }) {
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
  if (terminal) return <div className="order-catalog-item__actions"><OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} /></div>
  const active = paid && ['using', 'replacement_using'].includes(item.customerRentalStatus) && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const canExtend = !item.refundPending
    && paid
    && ['using', 'extension_waiting'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '')
    && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const now = Date.now()
  const canConfirm = active && !confirmedAt && Boolean(item.automaticConfirmationAt && item.serviceStartedAt && item.serviceEndsAt
    && new Date(`${item.serviceStartedAt}+09:00`).getTime() <= now && new Date(`${item.serviceEndsAt}+09:00`).getTime() > now)
  const confirmDialog = <OrderPurchaseConfirmDialog isOpen={open} onClose={() => { if (!confirmation.isPending) setOpen(false) }} confirmLabel={confirmation.isPending ? '처리 중…' : '구매확정하기'} confirmDisabled={confirmation.isPending} error={confirmation.isError ? '구매확정을 처리하지 못했습니다. 최신 주문 상태를 확인한 뒤 다시 시도해 주세요.' : undefined} onConfirm={() => { if (!busy.current) { busy.current = true; confirmation.mutate() } }} points={item.expectedPoints} />
  if (variant === 'dashboard') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}><span>구매확정 {item.automaticConfirmationAt ? `(자동 구매확정일: ${accountDate(item.automaticConfirmationAt).slice(0, 10)})` : ''}</span>{item.expectedPoints !== null ? <span className="mypage-home-use__tooltip"><img alt="" src={tollIcon}/>포인트 받기</span> : null}</Button> : null}
    {confirmDialog}
  </>
  if (variant === 'purchase-summary') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}>구매확정 {item.automaticConfirmationAt ? `(자동 구매확정일: ${accountDate(item.automaticConfirmationAt).slice(0, 10)})` : ''}</Button> : null}
    {item.expectedPoints !== null ? <b>포인트 {item.expectedPoints.toLocaleString('ko-KR')}P 받기</b> : null}
    {confirmDialog}
  </>
  if (item.billingUnit === 'unit' && item.durationUnits === null && item.pcAssetId === null && !item.rentalId)
    return paid ? <PartPurchaseActions api={api} item={item}/> : null
  return <>
    <button
      className={`order-catalog-item__confirm${canConfirm ? ' is-active' : ''}`}
      disabled={!canConfirm || confirmation.isPending}
      onClick={() => setOpen(true)}
      type="button"
    >
      {confirmedAt
        ? `구매확정 완료 (확정일: ${accountDate(confirmedAt).slice(0, 10)})`
        : `구매확정${item.automaticConfirmationAt ? ` (자동 구매확정일: ${accountDate(item.automaticConfirmationAt).slice(0, 10)})` : ''}`}
      {canConfirm && item.expectedPoints !== null ? <span>◉ {item.expectedPoints.toLocaleString('ko-KR')}P 받기<i aria-hidden="true" /></span> : null}
    </button>
    <div className="order-catalog-item__actions">
      <div className="order-catalog-item__action-primary">
        {item.rentalId && canExtend && myAccount.rcpcApi
          ? <RcpcExtensionCheckout api={myAccount.rcpcApi} rentalIds={[Number(item.rentalId)]} displayTargets={[{ rcpcId: item.productNo, cpu: item.title }]} triggerLabel="기간 연장" />
          : <Button size="small" variant="secondary" disabled>기간 연장</Button>}
        {confirmedAt && paid && !item.refundPending
          ? <OrderReview item={item} />
          : <Button size="small" variant="secondary" disabled>후기 작성</Button>}
      </div>
      <OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} />
    </div>
    {confirmation.data && <p className="order-item__confirmation-message" role="status">구매확정되었습니다. {confirmation.data.accruedPoints.toLocaleString('ko-KR')}포인트가 적립되었습니다.</p>}
    {confirmDialog}
  </>
}

export function OrderItemSupportActions({ item, orderNo, orderDetail, paymentStatus, orderStatus }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; paymentStatus: string; orderStatus: string }) {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const paid = paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)
  const active = paid && !item.purchaseConfirmedAt && !item.refundPending && ['using', 'replacement_using'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)

  if (item.billingUnit === 'unit' && !item.rentalId) return null
  return <div className="order-catalog-item__action-support">
    {item.rentalId && myAccount.inquiryApi ? <InquiryRefundApplication api={myAccount.inquiryApi} initialRentalIds={[Number(item.rentalId)]} triggerEnabled={!terminal && active} triggerLabel="해지신청" /> : null}
    {terminal ? null : item.refundPending && orderNo && orderDetail && myAccount.inquiryApi
      ? <RefundWithdrawalAction order={orderDetail} itemId={item.orderItemId} />
      : item.rentalId && myAccount.inquiryApi && active
        ? null
        : <Button size="small" variant="secondary" disabled>해지신청</Button>}
    {!item.rentalId ? <Button size="small" variant="secondary" disabled>문의</Button>
      : myAccount.inquiryApi && myAccount.rcpcApi
        ? <Button size="small" variant="secondary" onClick={() => setInquiryOpen(true)}>문의</Button>
        : <Button as={RelativeLink} size="small" variant="secondary" to={`/mypage/inquiries?productNo=${encodeURIComponent(item.productNo)}`}>문의</Button>}
    {inquiryOpen && myAccount.inquiryApi && myAccount.rcpcApi ? <InquiryCreateDialog api={myAccount.inquiryApi} rcpcApi={myAccount.rcpcApi} initialIds={item.pcAssetId ? [Number(item.pcAssetId)] : []} initialProductNo={item.pcAssetId ? '' : item.productNo} onClose={() => setInquiryOpen(false)} onCreated={async id => { setInquiryOpen(false); await client.invalidateQueries({ queryKey: ['operation-requests', myAccount.inquiryApi?.organizationId] }); navigate(`/mypage/inquiries/${id}`) }} /> : null}
  </div>
}
