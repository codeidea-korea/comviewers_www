import { createContext,useCallback,useContext,useMemo,useState,type ReactNode } from 'react'
import { useMutation,useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { ApiClientError } from '@/api/httpClient'
import { Modal } from '@/components/ui/ModalControl'
import { accountMoney } from '../shared/AccountReadCommon'

export type StorageSelectedGroup = {items:{id:number;units:number|null;label:string;unitLabel:string}[];amount:number;rentalAmount:number;setupFeeAmount:number;points:number;valid:boolean;availableCount:number;state:'pending'|'ready'|'error';selectAll?:(selected:boolean)=>void}
const empty:StorageSelectedGroup={items:[],amount:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:true,availableCount:0,state:'ready'}
const SelectionContext=createContext<{locked:boolean;hasPending:boolean;hasError:boolean;hasParts:boolean;report:(kind:'rentals'|'parts',selection:StorageSelectedGroup)=>void}|null>(null)
export const useMixedStorageSelection=()=>useContext(SelectionContext)
export function MixedStorageCheckout({api,children}:{api:MyAccountReadServices;children:ReactNode}) {
  const [groups,setGroups]=useState<{rentals:StorageSelectedGroup;parts:StorageSelectedGroup}>({rentals:empty,parts:{...empty,state:'pending'}})
  const [attempt,setAttempt]=useState<{selection:typeof groups;key:string}|null>(null)
  const [confirmOpen,setConfirmOpen]=useState(false)
  const navigate=useNavigate();const client=useQueryClient()
  const report=useCallback((kind:'rentals'|'parts',selection:StorageSelectedGroup)=>setGroups(previous=>({...previous,[kind]:selection})),[])
  const selection=useMemo(()=>({locked:Boolean(attempt),hasPending:groups.parts.state==='pending',hasError:groups.parts.state==='error',hasParts:groups.parts.availableCount>0,report}),[attempt,groups.parts.state,groups.parts.availableCount,report])
  const move=useMutation({mutationFn:(current:{selection:typeof groups;key:string})=>api.moveMixedStorage({
    rentals:current.selection.rentals.items.map(item=>({itemId:item.id,durationUnits:item.units})),parts:current.selection.parts.items.map(item=>({id:item.id,quantity:item.units??0}))},current.key),
    onSuccess:async result=>{setAttempt(null);await Promise.all([client.invalidateQueries({queryKey:['my-account']}),client.invalidateQueries({queryKey:['cart']})]);const params=new URLSearchParams();result.cartItemIds.forEach(id=>params.append('cartItemId',String(id)));navigate(`/checkout?${params}`)},
    onError:error=>{if(error instanceof ApiClientError&&error.status!==undefined&&[400,403,404,409,422].includes(error.status))setAttempt(null)}})
  const count=groups.rentals.items.length+groups.parts.items.length;const amount=groups.rentals.amount+groups.parts.amount;const points=groups.rentals.points+groups.parts.points
  const availableCount=groups.rentals.availableCount+groups.parts.availableCount
  const allSelected=availableCount>0&&count===availableCount
  const selectAll=(selected:boolean)=>{groups.rentals.selectAll?.(selected);groups.parts.selectAll?.(selected)}
  const valid=groups.rentals.valid&&groups.parts.valid&&count>0&&count<=100&&Number.isSafeInteger(amount)&&Number.isSafeInteger(points)
  const stateClass=availableCount>0?'':groups.parts.state==='pending'?' is-loading':groups.parts.state==='error'?' is-error':' is-empty'
  return <SelectionContext.Provider value={selection}><div className={`storage-catalog__body${stateClass}`}><section className="storage-catalog__items">
    <div className="storage-catalog__toolbar"><label><input aria-label="예약상품 전체 선택" ref={node=>{if(node)node.indeterminate=count>0&&!allSelected}} checked={allSelected} disabled={Boolean(attempt)||availableCount===0||groups.rentals.state!=='ready'||groups.parts.state!=='ready'} onChange={event=>selectAll(event.target.checked)} type="checkbox"/> 상품 정보</label><span>주문정보</span><span>소계</span></div>
    {children}</section>{availableCount>0?<aside className="purchase-summary cart-summary"><h2>주문 예상 금액</h2><div className="purchase-summary__box cart-summary__box"><dl>
    <div className="purchase-summary__products cart-summary__products">
      <div className="cart-summary__main"><dt>렌탈상품</dt><dd>{groups.rentals.valid?accountMoney(groups.rentals.amount):'기간 확인 필요'}</dd></div>
      <div className="cart-summary__sub"><dt>L 세팅비</dt><dd>{groups.rentals.valid?accountMoney(groups.rentals.setupFeeAmount):'기간 확인 필요'}</dd></div>
      <div className="cart-summary__sub"><dt>L 렌탈금액</dt><dd>{groups.rentals.valid?accountMoney(groups.rentals.rentalAmount):'기간 확인 필요'}</dd></div>
      <div className="cart-summary__main"><dt>파트상품</dt><dd>{groups.parts.valid?accountMoney(groups.parts.amount):'수량 확인 필요'}</dd></div>
    </div>
    <div aria-hidden="true" className="cart-summary__divider" />
    <div className="purchase-summary__points cart-summary__points"><dt>적립 포인트</dt><dd>{groups.rentals.valid&&groups.parts.valid?`${points.toLocaleString('ko-KR')}점`:'확인 필요'}</dd></div>
    <div aria-hidden="true" className="cart-summary__divider" />
    <div className="purchase-summary__total cart-summary__total"><dt>예상 결제 금액</dt><dd>{groups.rentals.valid&&groups.parts.valid&&Number.isSafeInteger(amount)?accountMoney(amount):'확인 필요'}</dd></div>
    <div aria-hidden="true" className="cart-summary__divider" />
    </dl><p>쿠폰·포인트는 결제 단계에서 사용할 수 있습니다.</p></div>
    <div className="purchase-summary__actions cart-summary__actions"><button type="button" disabled={move.isPending||(!attempt&&!valid)} onClick={()=>{if(!attempt)setAttempt({selection:groups,key:crypto.randomUUID()});setConfirmOpen(true)}}><strong>{move.isPending?'처리 중…':`선택 상품 ${count}개`}</strong> 구매하기</button></div>
    {move.error&&<p role="alert">주문서로 이동하지 못했습니다. 선택한 상품과 수량을 확인한 뒤 다시 시도해 주세요.</p>}</aside>:null}</div>
    <Modal isOpen={confirmOpen} title="보관함 상품 주문" closeLabel="취소" confirmLabel="장바구니로 이동 후 주문서 작성" confirmDisabled={move.isPending || !attempt}
      onClose={()=>{if(!move.isPending){setConfirmOpen(false);setAttempt(null)}}}
      onConfirm={()=>{if(attempt){setConfirmOpen(false);move.mutate(attempt)}}}>
      <p>선택한 {attempt ? attempt.selection.rentals.items.length + attempt.selection.parts.items.length : count}개 상품을 장바구니로 이동하고 주문서를 작성합니다.</p>
      <p>이동한 상품은 보관함에서 보이지 않으며, 주문서에서 뒤로 돌아와도 장바구니에 남습니다. 이후 구매는 장바구니에서 진행할 수 있습니다.</p>
    </Modal></SelectionContext.Provider>
}
