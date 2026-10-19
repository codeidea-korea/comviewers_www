import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import type { ExtensionOffer } from '@/api/extensionCheckout'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { StorageProductRow } from './StorageProductRow'
import { useMixedStorageSelection, type StorageSelectedGroup } from './MixedStorageCheckout'

const emptyOffers: readonly ExtensionOffer[] = []
const dateTime = (value: string) => value.replace('T', ' ').split('.')[0]

export function StorageExtensionItems({ api }: { api: MyRcpcReadServices }) {
  useUiTranslation()
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
    {offers.isError && <p role="alert">{uiText("보관 상품을 불러오지 못했습니다.")} <button type="button" onClick={() => void offers.refetch()}>{uiText("다시 시도")}</button></p>}
    {rows.map(row => <StorageProductRow key={row.id} productNo={row.productNo} title={row.title} serverRoom={row.serverRoomName}
      selected={selectedIds.includes(row.id)} disabled={!canPurchase || shared?.locked} onSelect={checked => setSelected(checked ? [...selectedIds, row.id] : selectedIds.filter(id => id !== row.id))}
      description={<><PcSpecSummary text={row.spec} fallback={uiText('등록된 PC 사양 정보가 없습니다.')} showMissingCores /><br />{uiText("현재 종료")} {dateTime(row.previousEnd)}<br />{uiText("예상 연장 종료")} {dateTime(row.targetEnd)}</>}
      fees={[{ label: uiText('세팅비'), amount: 0 }, { label: uiText('렌탈금액'), amount: row.quotedAmount }]} quantity={uiText('{days}일 연장', { days: row.addedDays })}
      amount={row.quotedAmount} points={Math.floor(row.quotedAmount / 100)} />)}
  </>
}
