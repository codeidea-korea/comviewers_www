import { StorageProductRow } from './StorageProductRow'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { extensionCheckoutStateSchema } from '@/domain/checkout/extensionCheckoutState'
import { useMixedStorageSelection, type StorageSelectedGroup } from './MixedStorageCheckout'

const emptyOffers: NonNullable<Awaited<ReturnType<MyAccountReadServices['partStorageOffers']>>> = []

export function PartStorageOffers({ api }: { api: MyAccountReadServices }) {
  const shared=useMixedStorageSelection()
  const [page,setPage]=useState(0)
  const offers = useQuery({ queryKey: ['my-account','read','part-storage',page], queryFn: () => api.partStorageOffers(page) })
  const [selected, setSelected] = useState<number[] | null>(null)
  const [quantities, setQuantities] = useState<Record<number,number>>({})
  const navigate = useNavigate()
  const rows = offers.data ?? emptyOffers
  const availableRows = useMemo(() => rows.filter(row => row.status === 'stored'), [rows])
  const selectedIds = useMemo(() => selected ?? availableRows.map(row => row.id), [selected, availableRows])
  const selectedRows = useMemo(() => availableRows.filter(row => selectedIds.includes(row.id)), [availableRows, selectedIds])
  const selectAll = useCallback((checked: boolean) => setSelected(checked ? availableRows.map(row => row.id) : []), [availableRows])
  const quantity = (row: typeof rows[number]) => quantities[row.id] ?? row.minimumQuantity
  const valid = selectedRows.length > 0 && new Set(selectedRows.map(row => row.productNo)).size === selectedRows.length
    && selectedRows.every(row => Number.isInteger(quantity(row)) && quantity(row) >= row.minimumQuantity && quantity(row) <= Math.min(row.maximumQuantity,row.availableQuantity))
  const total = selectedRows.reduce((sum,row) => sum + (row.unitPrice + row.setupFee) * quantity(row),0)
  const report=shared?.report
  const reportValue = useMemo<StorageSelectedGroup>(() => ({
    items: selectedRows.map(row => ({ id: row.id, units: quantities[row.id] ?? row.minimumQuantity, label: `${row.title} · ${row.productNo}`, unitLabel: '개' })),
    amount: Number.isSafeInteger(total) ? total : 0, rentalAmount: 0, setupFeeAmount: 0, points: 0,
    valid: selectedRows.length === 0 || (valid && Number.isSafeInteger(total)), availableCount: availableRows.length,
    state: offers.isPending ? 'pending' : offers.isError ? 'error' : 'ready', selectAll,
  }), [selectedRows, quantities, total, valid, availableRows.length, offers.isPending, offers.isError, selectAll])
  useEffect(() => { report?.('parts', reportValue) }, [report, reportValue])
  useEffect(()=>()=>{report?.('parts',{items:[],amount:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:true,availableCount:0,state:'pending'})},[report])
  const changePage=(next:number)=>{setPage(next);setSelected(null)}
  const startCheckout = () => {
    if (!valid || !Number.isSafeInteger(total)) return
    const state = extensionCheckoutStateSchema.parse({ kind: 'extension', selection: { rentalIds: [], pointAmount: 0,
      partOffers: selectedRows.map(row => ({ offerId: row.id, quantity: quantity(row) })),
    } })
    navigate('/checkout', { state })
  }
  if (offers.isPending || (!offers.isError && rows.length===0)) return null
  return <section className="part-storage-selection">
    {offers.isError && <p role="alert">예약 상품을 불러오지 못했습니다. <button onClick={() => void offers.refetch()} type="button">다시 시도</button></p>}
    {availableRows.map(row => <StorageProductRow key={row.id} productNo={row.productNo} title={row.title} serverRoom={row.serverRoomName}
      selected={selectedIds.includes(row.id)} disabled={shared?.locked} onSelect={checked => setSelected(checked ? [...selectedIds,row.id] : selectedIds.filter(id=>id!==row.id))}
      description={row.description || '등록된 상품 설명이 없습니다.'} fees={[{ label: '상품금액', amount: row.unitPrice }, { label: '세팅비', amount: row.setupFee }]}
      quantity={<QuantityStepper label={`${row.productNo} 수량`} showLabel={false} value={quantity(row)} minimum={row.minimumQuantity} maximum={Math.min(row.maximumQuantity,row.availableQuantity)} unit="개" disabled={shared?.locked} onChange={value=>setQuantities(old=>({...old,[row.id]:value}))}/>}
      amount={(row.unitPrice+row.setupFee)*quantity(row)} points={0} />)}
    {rows.length>=50||page>0?<nav className="storage-pages"><button type="button" disabled={page===0||shared?.locked} onClick={()=>changePage(page-1)}>이전</button><span>{page+1}페이지</span><button type="button" disabled={(rows.length<50)||shared?.locked} onClick={()=>changePage(page+1)}>다음</button></nav>:null}
    {new Set(selectedRows.map(row=>row.productNo)).size!==selectedRows.length&&<p role="alert">같은 품번의 보관 상품은 한 건씩 선택해 주세요.</p>}
    {!shared&&<button type="button" disabled={!valid || !Number.isSafeInteger(total)} onClick={startCheckout}>선택 상품 주문서 작성</button>}
  </section>
}
