import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import type { ExtensionOffer } from '@/api/extensionCheckout'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import storageProductImage from '@/assets/figma/store/product-04.png'
import { accountMoney } from '../shared/AccountReadCommon'
import { useMixedStorageSelection, type StorageSelectedGroup } from './MixedStorageCheckout'

const emptyOffers: readonly ExtensionOffer[] = []
const dateTime = (value: string) => value.replace('T', ' ').split('.')[0]

export function StorageExtensionItems({ api }: { api: MyRcpcReadServices }) {
  const shared = useMixedStorageSelection()
  const session = useSession()
  const canPurchase = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
    && session.customerSession.commerceAvailable
  const offers = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'extension-offers'],
    queryFn: () => api.extensionCheckout.offers(), retry: false })
  const rows = offers.data ?? emptyOffers
  const [selected, setSelected] = useState<readonly number[] | null>(null)
  const selectedIds = useMemo(() => selected ?? (canPurchase ? rows.map(row => row.id) : []), [selected, rows, canPurchase])
  const selectedRows = useMemo(() => rows.filter(row => selectedIds.includes(row.id)), [rows, selectedIds])
  const selectAll = useCallback((checked: boolean) => setSelected(checked && canPurchase ? rows.map(row => row.id) : []), [rows, canPurchase])
  const report = shared?.report
  const amount = selectedRows.reduce((sum, row) => sum + row.quotedAmount, 0)
  const points = selectedRows.reduce((sum, row) => sum + Math.floor(row.quotedAmount / 100), 0)
  const reportValue = useMemo<StorageSelectedGroup>(() => ({
    items: selectedRows.map(row => ({ id: row.id, rentalId: row.rentalId, units: row.addedDays, label: `${row.title} · ${row.productNo}`, unitLabel: '일' })),
    amount, rentalAmount: amount, setupFeeAmount: 0, points, valid: Number.isSafeInteger(amount) && Number.isSafeInteger(points)
      && new Set(selectedRows.map(row => row.rentalId)).size === selectedRows.length,
    availableCount: rows.length, state: offers.isPending ? 'pending' : offers.isError ? 'error' : 'ready', selectAll,
  }), [selectedRows, amount, points, rows.length, offers.isPending, offers.isError, selectAll])
  useEffect(() => { report?.('extensions', reportValue) }, [report, reportValue])
  useEffect(() => () => { report?.('extensions', { items: [], amount: 0, rentalAmount: 0, setupFeeAmount: 0, points: 0,
    valid: true, availableCount: 0, state: 'ready' }) }, [report])
  return <>
    {offers.isError && <p role="alert">보관 상품을 불러오지 못했습니다. <button type="button" onClick={() => void offers.refetch()}>다시 시도</button></p>}
    {rows.map(row => <article className="storage-catalog-product" key={row.id}>
      <header><label><input type="checkbox" disabled={!canPurchase || shared?.locked} checked={selectedIds.includes(row.id)}
        onChange={event => setSelected(event.target.checked ? [...selectedIds, row.id] : selectedIds.filter(id => id !== row.id))} />
        <strong>품번 {row.productNo}</strong><span>{row.serverRoomName ?? '-'}</span></label></header>
      <div><div className="storage-catalog-product__image"><img src={storageProductImage} alt={row.title} /></div>
        <section><span className="storage-catalog-product__column-title">상품 정보</span><strong>{row.title}</strong>
          <p>{row.spec ?? '등록된 PC 사양 정보가 없습니다.'}<br />현재 종료 {dateTime(row.previousEnd)}<br />예상 연장 종료 {dateTime(row.targetEnd)}</p></section>
        <dl><dt className="storage-catalog-product__column-title">주문정보</dt>
          <div><dt>세팅비</dt><dd>{accountMoney(0)}</dd></div><div><dt>렌탈금액</dt><dd>{accountMoney(row.quotedAmount)}</dd></div>
          <div className="storage-catalog-product__quantity"><dt>이용기간</dt><dd>{row.addedDays}일 연장</dd></div>
        </dl><footer><span className="storage-catalog-product__column-title">소계</span><strong>{accountMoney(row.quotedAmount)}</strong>
          <em>포인트 적립 {Math.floor(row.quotedAmount / 100).toLocaleString('ko-KR')}점</em></footer>
      </div>
    </article>)}
  </>
}
