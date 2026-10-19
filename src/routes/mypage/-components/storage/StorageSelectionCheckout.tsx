import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { AccountStorageItem } from '@/api/myAccountSchemas'
import { extensionCheckoutStateSchema } from '@/domain/checkout/extensionCheckoutState'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { useMixedStorageSelection, type StorageSelectedGroup } from './MixedStorageCheckout'
import { StorageProductRow } from './StorageProductRow'

export function StorageSelectionCheckout({ items }: { items: readonly AccountStorageItem[] }) {
  useUiTranslation()
  const shared=useMixedStorageSelection()
  const [selected, setSelected] = useState<readonly string[]>(() => items.filter(item => item.status === 'stored' && (!item.paymentDueAt || new Date(`${item.paymentDueAt}+09:00`).getTime() > Date.now())).map(item => item.id))
  const [units, setUnits] = useState<Record<string, number>>({})
  const navigate = useNavigate()
  const location = useLocation()
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
    const state = extensionCheckoutStateSchema.parse({ kind: 'extension', returnTo: `${location.pathname}${location.search}${location.hash}`, selection: { rentalIds: [], pointAmount: 0,
      storageItems: selectedItems.map(item => ({ itemId: Number(item.id), durationUnits: item.pricingType === 'rental' ? duration(item) : null })),
    } })
    navigate('/checkout', { state })
  }
  if (!available.length && shared) return null
  return <section className="storage-selection">{!shared&&<div className="storage-catalog__toolbar"><label><input checked={allSelected} disabled={!available.length} onChange={event=>selectAll(event.target.checked)} type="checkbox"/> {uiText("모두 선택")}</label></div>}{available.map(item => <StorageProductRow key={item.id}
    productNo={item.productNo} title={item.productTitle ?? uiText('상품명 미등록')} serverRoom={item.serverRoomName} imageUrl={item.imageUrl}
    description={item.billingUnit === 'unit' ? item.specSummary ?? '-' : <PcSpecSummary text={item.specSummary} fallback={uiText('등록된 PC 사양 정보가 없습니다.')} showMissingCores />} instantAvailable={item.instantAvailable}
    selected={selected.includes(item.id)} disabled={shared?.locked} onSelect={checked => setSelected(previous => checked ? [...previous, item.id] : previous.filter(id => id !== item.id))}
    fees={[{ label: uiText('세팅비'), amount: item.setupFee }, { label: item.pricingType === 'rental' ? uiText('월 렌탈료') : uiText('상품금액'), amount: item.unitPrice }]}
    quantity={item.pricingType==='rental'?<QuantityStepper label={uiText('{name} 이용기간', { name: item.productNo ?? uiText('보관 상품') })} showLabel={false} value={duration(item)} minimum={item.minUnits} maximum={item.maxUnits} unit={item.billingUnit==='thirty_day'?uiText('개월'):item.billingUnit==='day'?uiText('일'):item.billingUnit==='hour'?uiText('시간'):''} disabled={shared?.locked} onChange={value=>setUnits(previous=>({...previous,[item.id]:value}))}/>: uiText('1개')}
    amount={base(item)+(item.setupFee??0)} points={item.pricingType==='rental'?Math.floor(base(item)/100):0}
  />)}
    {!shared&&<button type="button" disabled={!valid || !Number.isSafeInteger(total)} onClick={startCheckout}>{uiText("선택 상품 주문서 작성")}</button>}
    {!available.length && (shared?.hasPending
      ? <p className="mypage-empty storage-empty" role="status">{uiText("예약 상품을 불러오는 중입니다.")}</p>
      : !shared?.hasError ? <p className="mypage-empty storage-empty">{uiText("결제할 예약 상품이 없습니다.")}</p> : null)}
  </section>
}
