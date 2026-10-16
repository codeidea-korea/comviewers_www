import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { Modal } from '@/components/ui/ModalControl'
import { useUiTranslation } from '@/i18n/uiTranslation'
import type { CheckoutCancellationRequest } from '@/api/ordersPayments'
import { checkoutReturnTo } from '@/domain/checkout/checkoutReturnTo'
import { useInvalidateProductCatalog } from '../hooks/useInvalidateProductCatalog'
import { checkoutCancellationReason } from './checkoutCancellationReason'

export function CheckoutCancellation({ request, returnTo, disabled, onLock, onReturn }: {
  request: () => CheckoutCancellationRequest | null; returnTo: string; disabled: boolean; onLock: () => void; onReturn?: () => void
}) {
  const { checkout } = useServices()
  const { uiText } = useUiTranslation()
  const client = useQueryClient()
  const navigate = useNavigate()
  const invalidateCatalog = useInvalidateProductCatalog()
  const active = useRef(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const cancel = useMutation({ mutationFn: async (input: CheckoutCancellationRequest) => {
    if (!checkout.cancelCheckout) throw new Error('주문서 취소 기능을 이용할 수 없습니다. 주문내역을 확인해 주세요.')
    const result = await checkout.cancelCheckout(input)
    // The cancellation outcome remains authoritative even if a background refresh fails.
    await Promise.allSettled([invalidateCatalog(), ...['checkout', 'cart', 'my-account', 'my-rcpcs', 'extension-checkout-quote']
      .map(key => client.invalidateQueries({ queryKey: [key] }))])
    return result
  } })
  const finished = cancel.data?.status === 'completed' || cancel.data?.status === 'partial'
  async function cancelCheckout() {
    if (active.current || disabled || finished) return
    const input = request()
    if (!input) { onReturn?.(); navigate(checkoutReturnTo(returnTo), { replace: true }); return }
    active.current = true
    onLock()
    try { await cancel.mutateAsync(input) } catch { /* Keep the creation key and permit an explicit retry. */ }
    finally { active.current = false }
  }
  return <>
    <Button className="checkout-cancel-button" fullWidth size="large" variant="secondary" disabled={disabled || cancel.isPending || finished}
      onClick={() => void cancelCheckout()}>{uiText(cancel.isPending ? '취소 처리 중…' : '주문서 작성 취소')}</Button>
    {cancel.error && <p className="checkout-submit-error" role="alert">{uiText(cancel.error.message)}</p>}
    {cancel.data && !finished && <p className="checkout-submit-error" role="alert">{uiText(cancel.data.status === 'pending'
      ? '결제 상태가 아직 확인되지 않아 주문서를 취소하지 못했습니다. 다시 확인해 주세요.'
      : '현재 결제 상태에서는 주문서를 취소할 수 없습니다. 주문내역을 확인해 주세요.')} {uiText(checkoutCancellationReason(cancel.data.reason))}</p>}
    <Modal isOpen={Boolean(finished && !acknowledged)} title={uiText(cancel.data?.status === 'partial' ? '주문 취소 · 구매 목록 복구 확인' : '주문서 취소 완료')}
      showClose={false} onClose={() => { /* Acknowledge the restore result before returning. */ }} onConfirm={() => {
        setAcknowledged(true); onReturn?.(); navigate(checkoutReturnTo(returnTo), { replace: true })
      }}>
      <p>{uiText(cancel.data?.status === 'partial' ? '주문은 취소했으나 일부 구매 목록을 복구하지 못했습니다. 아래 결과를 확인해 주세요.' : '주문서를 취소했습니다. 구매 목록은 현재 조건으로 다시 견적됩니다.')}</p>
      {cancel.data?.items.map(item => <p key={`${item.orderItemId}:${item.sourceType}:${item.sourceId ?? 'none'}`}>{uiText('주문 항목')} {item.orderItemId}: {uiText(item.status === 'restored' ? '복구 완료' : item.status === 'not_applicable' ? '복구 대상 아님' : '복구하지 못함')} {uiText(checkoutCancellationReason(item.reason))}</p>)}
    </Modal>
  </>
}
