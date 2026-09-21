import { useRef, useState } from 'react'
import { TranslatedText, useTranslation } from '@/i18n/translation'
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail, AccountOrderItem } from '@/api/myAccountOrders'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { OrderPurchaseConfirmDialog } from '@/components/mypage/OrderDialogsControl'

import { accountDate } from '../shared/AccountReadCommon'
import { OrderReview } from './OrderReview'
import { useServices } from '@/app/ServiceProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { PartPurchaseActions } from './PartPurchaseActions'
import { InquiryRefundApplication } from '../InquiryRefundApplication'
import { InquiryAction } from '../inquiries/InquiryAction'

import { Button } from '@/components/ui/ButtonControl'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { RefundWithdrawalAction } from './RefundWithdrawalAction'
import tollIcon from '@/assets/figma/icon-toll.svg'

export function OrderItemActions({ api, item, orderNo, paymentStatus, orderStatus, orderDetail, variant = 'default' }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; paymentStatus: string; orderStatus: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; variant?: 'default' | 'purchase-summary' | 'dashboard' }) {
  const { t } = useTranslation()
  const { myAccount } = useServices()
  const [open, setOpen] = useState(false)
  const [key] = useState(() => crypto.randomUUID())
  const busy = useRef(false)
  const client = useQueryClient()
  const { message: confirmationMessage, setMessage: setConfirmationMessage, toastKey } = useToastMessage()
  const confirmation = useMutation({ mutationFn: () => api.confirmPurchase(item.orderItemId, key), onSuccess: async (result) => {
    setOpen(false)
    setConfirmationMessage(t('order.confirmedPoints', { points: result.accruedPoints.toLocaleString('ko-KR') }))
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }), client.invalidateQueries({ queryKey: ['productReviewEligible', item.productNo] })])
  }, onSettled: () => { busy.current = false } })
  const confirmedAt = confirmation.data?.confirmedAt ?? item.purchaseConfirmedAt
  const paid = !item.refundPending && paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)
  if (terminal) return <div className="order-catalog-item__actions order-catalog-item__actions--terminal"><OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} /></div>
  const active = paid && ['using', 'replacement_using'].includes(item.customerRentalStatus) && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const canExtend = !item.refundPending
    && paid
    && ['using', 'extension_waiting'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '')
    && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const now = Date.now()
  const canConfirm = active && !confirmedAt && Boolean(item.automaticConfirmationAt && item.serviceStartedAt && item.serviceEndsAt
    && new Date(`${item.serviceStartedAt}+09:00`).getTime() <= now && new Date(`${item.serviceEndsAt}+09:00`).getTime() > now)
  const confirmDialog = <OrderPurchaseConfirmDialog isOpen={open} onClose={() => { if (!confirmation.isPending) setOpen(false) }} confirmLabel={confirmation.isPending ? t('common.processing') : t('order.confirmPurchase')} confirmDisabled={confirmation.isPending} error={confirmation.error?.message} onConfirm={() => { if (!busy.current) { busy.current = true; confirmation.mutate() } }} points={item.expectedPoints} />
  if (variant === 'dashboard') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}><span><TranslatedText id="order.purchaseConfirmation" /> {item.automaticConfirmationAt ? <span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>({t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})</span> : null}</span>{item.expectedPoints !== null ? <span className="mypage-home-use__tooltip"><img alt="" src={tollIcon}/>포인트 받기</span> : null}</Button> : null}
    {confirmDialog}
    <Toast message={confirmationMessage} toastKey={toastKey} />
  </>
  if (variant === 'purchase-summary') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}><TranslatedText id="order.purchaseConfirmation" /> {item.automaticConfirmationAt ? <span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>({t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})</span> : null}</Button> : null}
    {item.expectedPoints !== null ? <b>포인트 {item.expectedPoints.toLocaleString('ko-KR')}P 받기</b> : null}
    {confirmDialog}
    <Toast message={confirmationMessage} toastKey={toastKey} />
  </>
  if (item.billingUnit === 'unit' && item.durationUnits === null && item.pcAssetId === null && !item.rentalId)
    return paid ? <PartPurchaseActions api={api} item={item}/> : null
  return <>
    {!item.refundPending && <button
      className={`order-catalog-item__confirm${import.meta.env.DEV ? ' notranslate' : ''}${canConfirm ? ' is-active' : ''}`}
      translate={import.meta.env.DEV ? 'no' : undefined}
      disabled={!canConfirm || confirmation.isPending}
      onClick={() => setOpen(true)}
      type="button"
    >
      {confirmedAt
        ? t('order.confirmedDate', { date: accountDate(confirmedAt).slice(0, 10) })
        : `${t('order.purchaseConfirmation')}${item.automaticConfirmationAt ? ` (${t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})` : ''}`}
      {canConfirm && item.expectedPoints !== null ? <span>◉ {item.expectedPoints.toLocaleString('ko-KR')}P 받기<i aria-hidden="true" /></span> : null}
    </button>}
    <div className="order-catalog-item__actions">
      <div className="order-catalog-item__action-primary">
        {item.rentalId && canExtend && myAccount.rcpcApi
          ? <RcpcExtensionCheckout api={myAccount.rcpcApi} rentalIds={[Number(item.rentalId)]} displayTargets={[{ rcpcId: item.productNo, cpu: item.title }]} triggerLabel={t('rental.extend')} />
          : <Button size="small" variant="secondary" disabled><TranslatedText id="rental.extend" /></Button>}
        {confirmedAt && paid && !item.refundPending
          ? <OrderReview item={item} />
          : <Button size="small" variant="secondary" disabled><TranslatedText id="order.writeReview" /></Button>}
      </div>
      <OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} />
    </div>
    <Toast message={confirmationMessage} toastKey={toastKey} />
    {confirmDialog}
  </>
}

export function OrderItemSupportActions({ item, orderNo, orderDetail, paymentStatus, orderStatus }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; paymentStatus: string; orderStatus: string }) {
  const { t } = useTranslation()
  const { myAccount } = useServices()

  const paid = paymentStatus === 'approved' && ['paid', 'completed'].includes(orderStatus)
  const active = paid && !item.purchaseConfirmedAt && !item.refundPending && ['using', 'replacement_using'].includes(item.customerRentalStatus)
    && ['active', 'expiring'].includes(item.rentalStatus ?? '') && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)

  if (item.billingUnit === 'unit' && !item.rentalId) return null
  return <div className="order-catalog-item__action-support">
    {item.rentalId && myAccount.inquiryApi ? <InquiryRefundApplication api={myAccount.inquiryApi} initialRentalIds={[Number(item.rentalId)]} triggerEnabled={!terminal && active} triggerLabel={t('order.terminationRequest')} /> : null}
    {terminal ? null : item.refundPending && orderNo && orderDetail && myAccount.inquiryApi
      ? <RefundWithdrawalAction order={orderDetail} itemId={item.orderItemId} />
      : item.rentalId && myAccount.inquiryApi && active
        ? null
        : <Button size="small" variant="secondary" disabled><TranslatedText id="order.terminationRequest" /></Button>}
    <InquiryAction disabled={!item.rentalId} initialIds={item.pcAssetId ? [Number(item.pcAssetId)] : []} initialProductNo={item.pcAssetId ? '' : item.productNo} />
  </div>
}
