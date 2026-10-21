import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountOrderItem } from '@/api/myAccountOrders'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { Modal } from '@/components/ui/ModalControl'
import { OrderReview } from './OrderReview'
import { accountDate } from '../shared/AccountReadCommon'

export function PartPurchaseActions({ api,item }: { api: MyAccountReadServices; item: AccountOrderItem }) {
  useUiTranslation()
  const [open,setOpen] = useState(false);const [key] = useState(()=>crypto.randomUUID());const client = useQueryClient()
  const data = useQuery({ queryKey: ['my-account','part-fulfillment',item.orderItemId], queryFn: ()=>api.partFulfillment(item.orderItemId) })
  const confirm = useMutation({ mutationFn: ()=>api.confirmPurchase(item.orderItemId,key), onSuccess: async()=>{
    setOpen(false);await Promise.all([client.invalidateQueries({ queryKey: ['my-account'] }),client.invalidateQueries({ queryKey: ['productReviewEligible',item.productNo] })])
  } })
  const confirmedAt = confirm.data?.confirmedAt ?? data.data?.purchaseConfirmedAt ?? item.purchaseConfirmedAt
  return <div>{data.isError && <p role="alert">{uiText("수령 확인 상태를 조회하지 못했습니다.")} <button type="button" onClick={()=>void data.refetch()}>{uiText("다시 조회")}</button></p>}
    {data.data?.fulfilledAt ? <p>{uiText("관리자 이행 기록일")} {accountDate(data.data.fulfilledAt)}</p> : data.isSuccess && <p>{uiText("관리자 이행 기록 대기 중")}</p>}
    {confirmedAt ? <>{!item.purchaseConfirmationHidden && <p>{uiText("수령·구매확정일")} {accountDate(confirmedAt)}</p>}<OrderReview item={item}/></>
      : !item.purchaseConfirmationHidden && data.data?.canConfirm && <button type="button" disabled={confirm.isPending} onClick={()=>setOpen(true)}>{uiText("수령 확인·구매확정")}</button>}
    <Modal isOpen={open && !item.purchaseConfirmationHidden} title={uiText("부품 수령·구매확정")} closeLabel={uiText("취소")} confirmLabel={confirm.isPending?uiText('처리 중…'):uiText('수령 및 구매확정')} confirmDisabled={confirm.isPending}
      onClose={()=>{if(!confirm.isPending)setOpen(false)}} onConfirm={()=>confirm.mutate()}>
      <p>{uiText('{title} {count}개를 실제로 수령했는지 확인해 주세요.', { title: item.title, count: item.quantity })}</p><p>{uiText("이행 기록은 관리자가 입력한 정보입니다. 수령한 상품을 직접 확인한 뒤 확정해 주세요. 부품은 자동 구매확정 및 렌탈 적립 대상이 아닙니다.")}</p>
      {confirm.error && <p role="alert">{uiText(confirm.error.message)} {uiText("같은 요청으로 다시 확인할 수 있습니다.")}</p>}
    </Modal></div>
}
