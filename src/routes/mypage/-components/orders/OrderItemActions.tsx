import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useRef, useState } from 'react'
import { TranslatedText, useTranslation } from '@/i18n/translation'
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail, AccountOrderItem } from '@/api/myAccountOrders'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { OrderPurchaseConfirmDialog } from '@/components/mypage/OrderDialogsControl'

import { accountDate } from '../shared/AccountReadCommon'
import { OrderReview } from './OrderReview'
import { currentOrderPcAssetId } from './orderRentalPresentation'
import { useServices } from '@/app/ServiceProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { PartPurchaseActions } from './PartPurchaseActions'
import { InquiryRefundApplication } from '../InquiryRefundApplication'
import { InquiryAction } from '../inquiries/InquiryAction'

import { Button } from '@/components/ui/ButtonControl'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { RefundWithdrawalAction } from './RefundWithdrawalAction'
import tollIcon from '@/assets/figma/icon-toll.svg'
import { useSession } from '@/app/session/SessionProvider'

const rentalActionsClosed = (item: AccountOrderItem) => Boolean(item.rentalId) && (item.customerRentalStatus === 'termination_waiting' || ['terminated', 'refunded'].includes(item.rentalStatus ?? ''))

export function OrderItemActions({ api, item, orderNo, paymentStatus, orderStatus, orderDetail, variant = 'default' }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; paymentStatus: string; orderStatus: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; variant?: 'default' | 'purchase-summary' | 'dashboard' }) {
  useUiTranslation()
  const { t } = useTranslation()
  const { myAccount } = useServices()
  const session = useSession()
  const cManager = session.status === 'authenticated' && session.customerSession?.memberRole === 'c_manager'
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
  const paid = !item.refundPending && ['approved', 'partially_refunded'].includes(paymentStatus) && ['paid', 'completed'].includes(orderStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)
  const resumptionWaiting = item.customerRentalStatus === 'extension_waiting'
    && ['terminated', 'refunded'].includes(item.rentalStatus ?? '')
  if (terminal || rentalActionsClosed(item)) return variant === 'default' ? <div className="order-catalog-item__actions order-catalog-item__actions--terminal">
    {!cManager && !item.refundPending && resumptionWaiting && item.rentalId && myAccount.rcpcApi
      ? <RcpcExtensionCheckout api={myAccount.rcpcApi} rentalIds={[Number(item.rentalId)]} triggerLabel={uiText('기간연장')}/> : null}
    <OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} />
  </div> : null
  const active = paid && item.customerRentalStatus === 'active' && item.rentalStatus === 'active' && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const canExtend = !cManager && !item.refundPending
    && paid
    && (item.customerRentalStatus === 'active' || item.customerRentalStatus === 'extension_waiting')
    && item.rentalStatus === 'active'
    && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const now = Date.now()
  const canConfirm = !item.purchaseConfirmationHidden && (!cManager || Boolean(item.rentalId)) && active && !confirmedAt && Boolean(item.automaticConfirmationAt && item.serviceStartedAt && item.serviceEndsAt
    && new Date(`${item.serviceStartedAt}+09:00`).getTime() <= now && new Date(`${item.serviceEndsAt}+09:00`).getTime() > now)
  const confirmDialog = <OrderPurchaseConfirmDialog isOpen={open && !item.purchaseConfirmationHidden} onClose={() => { if (!confirmation.isPending) setOpen(false) }} confirmLabel={confirmation.isPending ? t('common.processing') : t('order.confirmPurchase')} confirmDisabled={confirmation.isPending} error={uiText(confirmation.error?.message)} onConfirm={() => { if (!busy.current) { busy.current = true; confirmation.mutate() } }} points={item.expectedPoints} />
  if (variant === 'dashboard') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}><span><TranslatedText id="order.purchaseConfirmation" /> {item.automaticConfirmationAt ? <span className="notranslate" translate="no">({t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})</span> : null}</span>{item.expectedPoints !== null ? <span className="mypage-home-use__tooltip"><img alt="" src={tollIcon}/>{uiText("포인트 받기")}</span> : null}</Button> : null}
    {confirmDialog}
    <Toast message={confirmationMessage} toastKey={toastKey} />
  </>
  if (variant === 'purchase-summary') return <>
    {canConfirm ? <Button fullWidth variant="secondary" disabled={confirmation.isPending} onClick={() => setOpen(true)}><TranslatedText id="order.purchaseConfirmation" /> {item.automaticConfirmationAt ? <span className="notranslate" translate="no">({t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})</span> : null}</Button> : null}
    {!item.purchaseConfirmationHidden && item.expectedPoints !== null ? <b><img alt="" src={tollIcon}/>{uiText('포인트 {points}P 받기', { points: item.expectedPoints.toLocaleString('ko-KR') })}</b> : null}
    {confirmDialog}
    <Toast message={confirmationMessage} toastKey={toastKey} />
  </>
  if (item.billingUnit === 'unit' && item.durationUnits === null && item.pcAssetId === null && !item.rentalId)
    return !cManager && paid ? <PartPurchaseActions api={api} item={item}/> : null
  return <>
    {!item.purchaseConfirmationHidden && !item.refundPending && <button
      className={`order-catalog-item__confirm notranslate${canConfirm ? ' is-active' : ''}`}
      translate="no"
      disabled={!canConfirm || confirmation.isPending}
      onClick={() => setOpen(true)}
      type="button"
    >
      {confirmedAt
        ? t('order.confirmedDate', { date: accountDate(confirmedAt).slice(0, 10) })
        : `${t('order.purchaseConfirmation')}${item.automaticConfirmationAt ? ` (${t('order.automaticConfirmationDate', { date: accountDate(item.automaticConfirmationAt).slice(0, 10) })})` : ''}`}
      {canConfirm && item.expectedPoints !== null ? <span className="order-catalog-item__points-tooltip"><span className="order-catalog-item__points-icon" aria-hidden="true"><img alt="" src="/assets/figma-tooltip.svg" /></span>{uiText("포인트 받기")}<i aria-hidden="true" /></span> : null}
    </button>}
    <div className="order-catalog-item__actions">
      {!cManager && <div className="order-catalog-item__action-primary">
        {item.rentalId && canExtend && myAccount.rcpcApi
          ? <RcpcExtensionCheckout api={myAccount.rcpcApi} rentalIds={[Number(item.rentalId)]} displayTargets={[{ rcpcId: item.productNo, cpu: item.title }]} triggerLabel={t('rental.extend')} />
          : <Button size="medium" variant="secondary" disabled><TranslatedText id="rental.extend" /></Button>}
        {confirmedAt && paid && !item.refundPending
          ? <OrderReview item={item} />
          : <Button size="medium" variant="secondary" disabled><TranslatedText id="order.writeReview" /></Button>}
      </div>}
      <OrderItemSupportActions api={api} item={item} orderNo={orderNo} orderDetail={orderDetail} paymentStatus={paymentStatus} orderStatus={orderStatus} />
    </div>
    <Toast message={confirmationMessage} toastKey={toastKey} />
    {confirmDialog}
  </>
}

export function OrderItemSupportActions({ item, orderNo, orderDetail, paymentStatus, orderStatus }: { api: MyAccountReadServices; item: AccountOrderItem; orderNo?: string; orderDetail?: UseQueryResult<AccountOrderDetail, Error>; paymentStatus: string; orderStatus: string }) {
  useUiTranslation()
  const { t } = useTranslation()
  const { myAccount } = useServices()

  const paid = ['approved', 'partially_refunded'].includes(paymentStatus) && ['paid', 'completed'].includes(orderStatus)
  const active = paid && !item.refundPending && item.customerRentalStatus === 'active'
    && item.rentalStatus === 'active' && ['paid', 'active', 'completed'].includes(item.itemStatus)
  const terminal = ['cancelled', 'refunded'].includes(orderStatus)
    || ['cancelled', 'refunded'].includes(paymentStatus)
    || ['cancelled', 'refunded'].includes(item.itemStatus)
  const inquiryPcAssetId = currentOrderPcAssetId(item)

  const actionsClosed = terminal || rentalActionsClosed(item)
  if (item.billingUnit === 'unit' && !item.rentalId) return null
  return <div className="order-catalog-item__action-support">
    {!actionsClosed && item.rentalId && myAccount.inquiryApi ? <InquiryRefundApplication api={myAccount.inquiryApi} initialRentalIds={[Number(item.rentalId)]} triggerEnabled={!terminal && active} triggerLabel={t('order.terminationRequest')} /> : null}
    {terminal ? null : item.refundPending && orderNo && orderDetail && myAccount.inquiryApi
      ? <RefundWithdrawalAction order={orderDetail} itemId={item.orderItemId} rentalId={item.rentalId} />
      : actionsClosed || (item.rentalId && myAccount.inquiryApi && active)
        ? null
        : <Button size="medium" variant="secondary" disabled><TranslatedText id="order.terminationRequest" /></Button>}
    <InquiryAction disabled={!item.rentalId || !inquiryPcAssetId} fixedTarget initialIds={inquiryPcAssetId ? [Number(inquiryPcAssetId)] : []} />
  </div>
}
