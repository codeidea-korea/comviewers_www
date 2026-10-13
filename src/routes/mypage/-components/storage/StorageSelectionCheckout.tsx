import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { AccountStorageItem } from '@/api/myAccountSchemas'
import { extensionCheckoutStateSchema } from '@/domain/checkout/extensionCheckoutState'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { accountMoney } from '../shared/AccountReadCommon'
import { useMixedStorageSelection, type StorageSelectedGroup } from './MixedStorageCheckout'
import storageProductImage from '@/assets/figma/store/product-04.png'

export function StorageSelectionCheckout({ items }: { items: readonly AccountStorageItem[] }) {
  const shared=useMixedStorageSelection()
  const [selected, setSelected] = useState<readonly string[]>(() => items.filter(item => item.status === 'stored' && (!item.paymentDueAt || new Date(`${item.paymentDueAt}+09:00`).getTime() > Date.now())).map(item => item.id))
  const [units, setUnits] = useState<Record<string, number>>({})
  const navigate = useNavigate()
  const available = useMemo(() => items.filter(item => item.status === 'stored' && (!item.paymentDueAt || new Date(`${item.paymentDueAt}+09:00`).getTime() > Date.now())), [items])
  const selectedItems = useMemo(() => available.filter(item => selected.includes(item.id)), [available, selected])
  const selectAll = useCallback((checked: boolean) => setSelected(checked ? available.map(item => item.id) : []), [available])
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
  const reportValue = useMemo<StorageSelectedGroup>(() => ({
    items: selectedItems.map(item => ({ id: Number(item.id), units: item.pricingType === 'rental' ? (units[item.id] ?? item.minUnits ?? 1) : null, label: [item.productTitle, item.productNo].filter(Boolean).join(' · '), unitLabel: ({ thirty_day: '개월', day: '일', hour: '시간' } as Record<string, string>)[item.billingUnit ?? ''] ?? '개' })),
    amount: total, rentalAmount, setupFeeAmount, points,
    valid: selectedItems.length === 0 || valid, availableCount: available.length, state: 'ready', selectAll,
  }), [selectedItems, units, total, rentalAmount, setupFeeAmount, points, valid, available.length, selectAll])
  useEffect(() => { report?.('rentals', reportValue) }, [report, reportValue])
  useEffect(()=>()=>{report?.('rentals',{items:[],amount:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:true,availableCount:0,state:'ready'})},[report])
  const allSelected=available.length>0&&selectedItems.length===available.length
  const startCheckout = () => {
    if (!valid || !Number.isSafeInteger(total)) return
    const state = extensionCheckoutStateSchema.parse({ kind: 'extension', selection: { rentalIds: [], pointAmount: 0,
      storageItems: selectedItems.map(item => ({ itemId: Number(item.id), durationUnits: item.pricingType === 'rental' ? duration(item) : null })),
    } })
    navigate('/checkout', { state })
  }
  if (!available.length && shared) return null
  return <section className="storage-selection">{!shared&&<div className="storage-catalog__toolbar"><label><input checked={allSelected} disabled={!available.length} onChange={event=>selectAll(event.target.checked)} type="checkbox"/> 모두 선택</label><span>주문정보</span><span>소계</span></div>}{available.map(item => <article className="storage-catalog-product" key={item.id}>
    <header><label><input type="checkbox" disabled={shared?.locked} checked={selected.includes(item.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))}/><strong>품번 {item.productNo ?? '-'}</strong><span>{item.serverRoomName ?? '-'}</span></label></header>
    <div><div className="storage-catalog-product__image"><img src={item.imageUrl && /^(https?:\/\/|\/[^/])/.test(item.imageUrl) ? item.imageUrl : storageProductImage} alt={item.productTitle ?? '예약 상품'}/></div><section><span className="storage-catalog-product__column-title">상품 정보</span><strong>{item.productTitle ?? '상품명 미등록'}</strong><p>{item.instantAvailable ? '결제 후 바로 접속 가능합니다.' : '접속 준비 상태를 확인해 주세요.'}<br/>{item.specSummary ?? '등록된 PC 사양 정보가 없습니다.'}</p></section><dl><dt className="storage-catalog-product__column-title">주문정보</dt>
      <div><dt>세팅비</dt><dd>{accountMoney(item.setupFee)}</dd></div><div><dt>{item.pricingType==='rental'?'월 렌탈료':'상품금액'}</dt><dd>{accountMoney(item.unitPrice)}</dd></div>
      <div className="storage-catalog-product__quantity"><dt>{item.pricingType==='rental'?'이용기간':'수량'}</dt><dd>{item.pricingType==='rental'?<QuantityStepper label={`${item.productNo ?? '보관 상품'} 이용기간`} showLabel={false} value={duration(item)} minimum={item.minUnits} maximum={item.maxUnits} unit={item.billingUnit==='thirty_day'?'개월':item.billingUnit==='day'?'일':item.billingUnit==='hour'?'시간':''} disabled={shared?.locked} onChange={value=>setUnits(previous=>({...previous,[item.id]:value}))}/>: '1개'}</dd></div>
    </dl><footer><span className="storage-catalog-product__column-title">소계</span><strong>{accountMoney(base(item)+(item.setupFee??0))}</strong><em>포인트 적립 {item.pricingType==='rental'?Math.floor(base(item)/100).toLocaleString():0}점</em></footer></div>
  </article>)}
    {!shared&&<button type="button" disabled={!valid || !Number.isSafeInteger(total)} onClick={startCheckout}>선택 상품 주문서 작성</button>}
    {!available.length && (shared?.hasPending
      ? <p className="mypage-empty storage-empty" role="status">예약 상품을 불러오는 중입니다.</p>
      : !shared?.hasError ? <p className="mypage-empty storage-empty">결제할 예약 상품이 없습니다.</p> : null)}
  </section>
}
