import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountStorageItem } from '@/api/myAccountSchemas'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { Modal } from '@/components/ui/ModalControl'
import { accountMoney } from './AccountReadCommon'
import { useMixedStorageSelection } from './MixedStorageCheckout'

export function StorageSelectionCheckout({ api, items }: { api: MyAccountReadServices; items: readonly AccountStorageItem[] }) {
  const shared=useMixedStorageSelection()
  const [selected, setSelected] = useState<readonly string[]>([])
  const [units, setUnits] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState<readonly { itemId: number; durationUnits: number | null }[] | null>(null)
  const key = useRef(crypto.randomUUID())
  const navigate = useNavigate()
  const client = useQueryClient()
  const available = items.filter(item => item.status === 'stored' && (!item.paymentDueAt || new Date(`${item.paymentDueAt}+09:00`).getTime() > Date.now()))
  const selectedItems = available.filter(item => selected.includes(item.id))
  const duration = (item: AccountStorageItem) => units[item.id] ?? item.minUnits ?? 1
  const valid = selectedItems.length > 0 && selectedItems.every(item => item.unitPrice !== null && item.setupFee !== null
    && (item.pricingType === 'one_time' || (item.pricingType === 'rental' && item.minUnits !== null && item.maxUnits !== null
      && Number.isInteger(duration(item)) && duration(item) >= item.minUnits && duration(item) <= item.maxUnits)))
  const base = (item: AccountStorageItem) => (item.unitPrice ?? 0) * (item.pricingType === 'rental' ? duration(item) : 1)
  const total = selectedItems.reduce((sum, item) => sum + base(item) + (item.setupFee ?? 0), 0)
  const points = selectedItems.reduce((sum, item) => sum + (item.pricingType === 'rental' ? Math.floor(base(item) / 100) : 0), 0)
  const report=shared?.report
  const rentalAmount=selectedItems.reduce((sum,item)=>sum+base(item),0)
  const setupFeeAmount=selectedItems.reduce((sum,item)=>sum+(item.setupFee??0),0)
  const reportValue=JSON.stringify({items:selectedItems.map(item=>({id:Number(item.id),units:item.pricingType==='rental'?duration(item):null,label:[item.productTitle,item.productNo].filter(Boolean).join(' · '),unitLabel:({thirty_day:'개월',day:'일',hour:'시간'} as Record<string,string>)[item.billingUnit??'']??'개'})),amount:total,rentalAmount,setupFeeAmount,points,valid:selectedItems.length===0||valid,availableCount:available.length,state:'ready'})
  useEffect(()=>{report?.('rentals',JSON.parse(reportValue))},[report,reportValue])
  useEffect(()=>()=>{report?.('rentals',{items:[],amount:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:true,availableCount:0,state:'ready'})},[report])
  const move = useMutation({ mutationFn: () => {
    if (!attempt) throw new Error('선택 상품을 다시 확인해 주세요.')
    return api.moveStorageBatch(attempt, key.current)
  }, onSuccess: async result => {
    await Promise.all([client.invalidateQueries({ queryKey: ['my-account', 'http', 'storage'] }), client.invalidateQueries({ queryKey: ['cart'] })])
    if (result.some(item => !item.cartItemId)) throw new Error('장바구니 연결을 확인해 주세요.')
    const params = new URLSearchParams()
    result.forEach(item => params.append('cartItemId', item.cartItemId!))
    navigate(`/checkout?${params.toString()}`)
  } })
  const allSelected=available.length>0&&selectedItems.length===available.length
  return <section className="storage-selection"><div className="storage-catalog__toolbar"><label><input checked={allSelected} disabled={!available.length||move.isPending||Boolean(attempt)||shared?.locked} onChange={event=>setSelected(event.target.checked?available.map(item=>item.id):[])} type="checkbox"/> 상품 정보</label><span>주문정보</span><span>소계</span></div>{available.map(item => <article className="storage-catalog-product storage-catalog-product--live" key={item.id}>
    <header><label><input type="checkbox" disabled={move.isPending || Boolean(attempt)||shared?.locked} checked={selected.includes(item.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))}/><strong>품번 {item.productNo ?? '-'}</strong><span>{item.serverRoomName ?? '-'}</span></label></header>
    <div><div className="storage-catalog-product__image">{item.imageUrl && /^(https?:\/\/|\/[^/])/.test(item.imageUrl)?<img src={item.imageUrl} alt={item.productTitle ?? '예약 상품'}/>:<span>img</span>}</div><section><span className="storage-catalog-product__column-title">상품 정보</span><strong>{item.productTitle ?? '상품명 미등록'}</strong><p>{item.instantAvailable ? '결제 후 바로 접속 가능합니다.' : '접속 준비 상태를 확인해 주세요.'}<br/>{item.specSummary ?? '등록된 PC 사양 정보가 없습니다.'}</p></section><dl><dt className="storage-catalog-product__column-title">주문정보</dt>
      <div><dt>세팅비</dt><dd>{accountMoney(item.setupFee)}</dd></div><div><dt>{item.pricingType==='rental'?'월 렌탈료':'상품금액'}</dt><dd>{accountMoney(item.unitPrice)}</dd></div>
      <div><dt>{item.pricingType==='rental'?'이용기간':'수량'}</dt><dd>{item.pricingType==='rental'?<label><input aria-label={`${item.productTitle ?? item.productNo ?? '보관 상품'} 이용기간`} type="number" min={item.minUnits??1} max={item.maxUnits??undefined} value={duration(item)} disabled={move.isPending||Boolean(attempt)||shared?.locked} onChange={event=>setUnits(previous=>({...previous,[item.id]:Number(event.target.value)}))}/>{item.billingUnit==='thirty_day'?'개월':item.billingUnit}</label>:'1개'}</dd></div>
    </dl><footer><span className="storage-catalog-product__column-title">소계</span><strong>{accountMoney(base(item)+(item.setupFee??0))}</strong><em>포인트 적립 {item.pricingType==='rental'?Math.floor(base(item)/100).toLocaleString():0}점</em></footer></div>
  </article>)}
    {!shared&&<button type="button" disabled={move.isPending || (!attempt && !valid)} onClick={() => { if (!attempt) { setAttempt(selectedItems.map(item => ({ itemId: Number(item.id), durationUnits: item.pricingType === 'rental' ? duration(item) : null }))); key.current = crypto.randomUUID() } setOpen(true) }}>선택 상품 주문서 작성</button>}
    {attempt && !move.isPending && !move.isError && <button type="button" onClick={() => setAttempt(null)}>선택 수정</button>}
    {!available.length && (shared?.hasPending
      ? <p className="mypage-empty storage-empty" role="status">예약 상품을 불러오는 중입니다.</p>
      : !shared?.hasError ? <p className="mypage-empty storage-empty">결제할 예약 상품이 없습니다.</p> : null)}
    <Modal isOpen={open} title="예약 상품 주문" closeLabel="취소" confirmLabel={move.isPending ? '처리 중…' : '장바구니 이동 후 주문'} confirmDisabled={move.isPending} onClose={() => { if (!move.isPending) { setOpen(false); if (!move.isError) setAttempt(null) } }} onConfirm={() => move.mutate()}>
      <p>선택한 {attempt?.length ?? 0}개 상품의 이용기간을 확인했습니다. 주문서에서 최신 가격과 혜택을 다시 확인합니다.</p>
      {move.error && <p role="alert">{move.error.message} 같은 요청으로 다시 확인할 수 있습니다.</p>}
    </Modal>
  </section>
}
