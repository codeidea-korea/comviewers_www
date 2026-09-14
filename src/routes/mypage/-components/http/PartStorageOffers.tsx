import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { Modal } from '@/components/ui/ModalControl'
import { accountMoney } from './AccountReadCommon'
import { ApiClientError } from '@/api/httpClient'
import { useMixedStorageSelection } from './MixedStorageCheckout'

export function PartStorageOffers({ api }: { api: MyAccountReadServices }) {
  const shared=useMixedStorageSelection()
  const [page,setPage]=useState(0)
  const offers = useQuery({ queryKey: ['my-account','http','part-storage',page], queryFn: () => api.partStorageOffers(page) })
  const [selected, setSelected] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number,number>>({})
  const [attempt, setAttempt] = useState<readonly { id: number; quantity: number }[] | null>(null)
  const [open, setOpen] = useState(false)
  const key = useRef(crypto.randomUUID())
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const rows = offers.data ?? []
  const selectedRows = rows.filter(row => row.status==='stored' && selected.includes(row.id))
  const quantity = (row: typeof rows[number]) => quantities[row.id] ?? row.minimumQuantity
  const valid = selectedRows.length > 0 && new Set(selectedRows.map(row => row.productNo)).size === selectedRows.length
    && selectedRows.every(row => Number.isInteger(quantity(row)) && quantity(row) >= row.minimumQuantity && quantity(row) <= Math.min(row.maximumQuantity,row.availableQuantity))
  const total = selectedRows.reduce((sum,row) => sum + (row.unitPrice + row.setupFee) * quantity(row),0)
  const report=shared?.report
  const availableRows=rows.filter(row=>row.status==='stored')
  const reportValue=JSON.stringify({items:selectedRows.map(row=>({id:row.id,units:quantity(row),label:`${row.title} · ${row.productNo}`,unitLabel:'개'})),amount:Number.isSafeInteger(total)?total:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:selectedRows.length===0||(valid&&Number.isSafeInteger(total)),availableCount:availableRows.length,state:offers.isPending?'pending':offers.isError?'error':'ready'})
  useEffect(()=>{report?.('parts',JSON.parse(reportValue))},[report,reportValue])
  useEffect(()=>()=>{report?.('parts',{items:[],amount:0,rentalAmount:0,setupFeeAmount:0,points:0,valid:true,availableCount:0,state:'pending'})},[report])
  const move = useMutation({ mutationFn: () => { if(!attempt) throw new Error('선택 수량을 확인해 주세요.'); return api.movePartStorageBatch(attempt,key.current) },
    onSuccess: async result => { if(result.some(row => !row.cartItemId)) throw new Error('연결된 장바구니 상품을 확인할 수 없습니다.')
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['my-account','http','part-storage'] }),queryClient.invalidateQueries({ queryKey: ['cart'] })])
      const params = new URLSearchParams(); result.forEach(row => params.append('cartItemId',String(row.cartItemId))); navigate(`/checkout?${params}`)
    } })
  const rejected=move.error instanceof ApiClientError && move.error.status!==undefined && [400,403,404,409,422].includes(move.error.status)
  const changePage=(next:number)=>{setPage(next);setSelected([])}
  if (offers.isPending || (!offers.isError && rows.length===0)) return null
  return <section className="part-storage-selection">
    {offers.isError && <p role="alert">예약 상품을 불러오지 못했습니다. <button onClick={() => void offers.refetch()} type="button">다시 시도</button></p>}
    {availableRows.map(row => <article className="storage-catalog-product storage-catalog-product--live storage-catalog-product--part" key={row.id}><header><label><input type="checkbox" disabled={Boolean(attempt)||shared?.locked} checked={selected.includes(row.id)} onChange={event => setSelected(old => event.target.checked ? [...old,row.id] : old.filter(id=>id!==row.id))}/><strong>{row.productNo}</strong><span>{row.serverRoomName}</span></label></header>
      <div><div className="storage-catalog-product__image"><span>img</span></div><section><span className="storage-catalog-product__column-title">상품 정보</span><strong>{row.title}</strong><p>{row.description || '등록된 상품 설명이 없습니다.'}</p></section><dl><dt className="storage-catalog-product__column-title">주문정보</dt><div><dt>상품금액</dt><dd>{accountMoney(row.unitPrice)}</dd></div><div><dt>세팅비</dt><dd>{accountMoney(row.setupFee)}</dd></div><div><dt>수량</dt><dd><label><input type="number" min={row.minimumQuantity} max={Math.min(row.maximumQuantity,row.availableQuantity)} value={quantity(row)} disabled={Boolean(attempt)||shared?.locked} onChange={event=>setQuantities(old=>({...old,[row.id]:Number(event.target.value)}))}/>개</label></dd></div></dl><footer><span className="storage-catalog-product__column-title">소계</span><strong>{accountMoney((row.unitPrice+row.setupFee)*quantity(row))}</strong><em>포인트 적립 0점</em></footer></div>
    </article>)}
    {rows.length>=50||page>0?<nav className="storage-pages"><button type="button" disabled={page===0||Boolean(attempt)||shared?.locked} onClick={()=>changePage(page-1)}>이전</button><span>{page+1}페이지</span><button type="button" disabled={(rows.length<50)||Boolean(attempt)||shared?.locked} onClick={()=>changePage(page+1)}>다음</button></nav>:null}
    {new Set(selectedRows.map(row=>row.productNo)).size!==selectedRows.length&&<p role="alert">같은 품번의 보관 상품은 한 건씩 선택해 주세요.</p>}
    {!shared&&<button type="button" disabled={move.isPending || (!attempt && (!valid || !Number.isSafeInteger(total)))} onClick={()=>{if(!attempt){setAttempt(selectedRows.map(row=>({id:row.id,quantity:quantity(row)})));key.current=crypto.randomUUID()}setOpen(true)}}>선택 상품 주문서 작성</button>}
    <Modal isOpen={open} title="파트 예약 상품 주문" closeLabel="취소" confirmLabel={move.isPending ? '처리 중…' : '장바구니 이동 후 주문'} confirmDisabled={move.isPending}
      onClose={()=>{if(!move.isPending){setOpen(false);if(!move.isError||rejected){setAttempt(null);move.reset()}}}} onConfirm={()=>move.mutate()}><p>선택한 상품과 수량을 장바구니에 반영합니다. 주문서에서 쿠폰·포인트와 결제 금액을 확인해 주세요.</p>{move.error && <p role="alert">{move.error.message} 같은 요청으로 다시 확인할 수 있습니다.</p>}</Modal>
  </section>
}
