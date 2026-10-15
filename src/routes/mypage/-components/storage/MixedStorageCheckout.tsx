import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { extensionCheckoutStateSchema } from '@/domain/checkout/extensionCheckoutState'
import { accountMoney } from '../shared/AccountReadCommon'

type StorageLoadState = 'pending' | 'ready' | 'error'
export type StorageSelectedGroup = {
  items: { id: number; units: number | null; label: string; unitLabel: string; rentalId?: number }[]
  amount: number; rentalAmount: number; setupFeeAmount: number; points: number; valid: boolean
  availableCount: number; state: StorageLoadState; selectAll?: (selected: boolean) => void
}
const empty: StorageSelectedGroup = { items: [], amount: 0, rentalAmount: 0, setupFeeAmount: 0, points: 0, valid: true, availableCount: 0, state: 'ready' }
type Groups = { rentals: StorageSelectedGroup; parts: StorageSelectedGroup; extensions: StorageSelectedGroup }
const SelectionContext = createContext<{
  locked: boolean; hasPending: boolean; hasError: boolean; hasParts: boolean
  report: (kind: keyof Groups, selection: StorageSelectedGroup) => void
} | null>(null)
export const useMixedStorageSelection = () => useContext(SelectionContext)

export function MixedStorageCheckout({ children, rentalsState = 'ready', hasExtensionSource = false }: {
  children: ReactNode; rentalsState?: StorageLoadState; hasExtensionSource?: boolean
}) {
  useUiTranslation()
  const [groups, setGroups] = useState<Groups>({ rentals: empty, parts: { ...empty, state: 'pending' },
    extensions: { ...empty, state: hasExtensionSource ? 'pending' : 'ready' } })
  const navigate = useNavigate()
  const report = useCallback((kind: keyof Groups, group: StorageSelectedGroup) => setGroups(previous => ({ ...previous, [kind]: group })), [])
  const hasPending = rentalsState === 'pending' || groups.parts.state === 'pending' || groups.extensions.state === 'pending'
  const hasError = rentalsState === 'error' || groups.parts.state === 'error' || groups.extensions.state === 'error'
  const selection = useMemo(() => ({ locked: false, hasPending, hasError,
    hasParts: groups.parts.availableCount + groups.extensions.availableCount > 0, report }), [hasPending, hasError, groups.parts.availableCount, groups.extensions.availableCount, report])
  const groupList = [groups.rentals, groups.parts, groups.extensions]
  const count = groupList.reduce((sum, group) => sum + group.items.length, 0)
  const amount = groupList.reduce((sum, group) => sum + group.amount, 0)
  const points = groupList.reduce((sum, group) => sum + group.points, 0)
  const availableCount = groupList.reduce((sum, group) => sum + group.availableCount, 0)
  const allSelected = availableCount > 0 && count === availableCount
  const selectAll = (selected: boolean) => { groupList.forEach(group => group.selectAll?.(selected)) }
  const valid = !hasPending && !hasError && groupList.every(group => group.valid) && count > 0 && count <= 100
    && Number.isSafeInteger(amount) && Number.isSafeInteger(points)
  const startCheckout = () => {
    if (!valid) return
    const offerIds = groups.extensions.items.map(item => item.id)
    const state = extensionCheckoutStateSchema.parse({ kind: 'extension', ...(offerIds.length ? { offerIds } : {}), selection: {
      rentalIds: groups.extensions.items.map(item => item.rentalId), pointAmount: 0,
      ...(offerIds.length ? { offerIds } : {}),
      ...(groups.rentals.items.length ? { storageItems: groups.rentals.items.map(item => ({ itemId: item.id, durationUnits: item.units })) } : {}),
      ...(groups.parts.items.length ? { partOffers: groups.parts.items.map(item => ({ offerId: item.id, quantity: item.units })) } : {}),
    } })
    navigate('/checkout', { state })
  }
  const rentalValid = groups.rentals.valid && groups.extensions.valid
  const stateClass = availableCount > 0 ? '' : hasPending ? ' is-loading' : hasError ? ' is-error' : ' is-empty'
  return <SelectionContext.Provider value={selection}><div className={`storage-catalog__body${stateClass}`}>
    <section className="storage-catalog__items">
      <div className="storage-catalog__toolbar"><label><input aria-label={uiText("보관상품 전체 선택")}
        ref={node => { if (node) node.indeterminate = count > 0 && !allSelected }} checked={allSelected}
        disabled={availableCount === 0 || hasPending || hasError}
        onChange={event => selectAll(event.target.checked)} type="checkbox" /> {uiText("모두 선택")}</label><span>{uiText("주문정보")}</span><span>{uiText("소계")}</span></div>
      {children}
      {!availableCount && (hasPending ? <p className="mypage-empty storage-empty" role="status">{uiText("보관 상품을 불러오는 중입니다.")}</p>
        : !hasError ? <p className="mypage-empty storage-empty">{uiText("결제할 예약 상품이 없습니다.")}</p> : null)}
    </section>
    {availableCount > 0 ? <aside className="purchase-summary cart-summary"><h2>{uiText("주문 예상 금액")}</h2>
      <div className="purchase-summary__box cart-summary__box"><dl>
        <div className="purchase-summary__products cart-summary__products">
          <div className="cart-summary__main"><dt>{uiText("렌탈상품")}</dt><dd>{rentalValid ? accountMoney(groups.rentals.amount + groups.extensions.amount) : uiText('기간 확인 필요')}</dd></div>
          <div className="cart-summary__sub"><dt>{uiText("L 세팅비")}</dt><dd>{rentalValid ? accountMoney(groups.rentals.setupFeeAmount) : uiText('기간 확인 필요')}</dd></div>
          <div className="cart-summary__sub"><dt>{uiText("L 렌탈금액")}</dt><dd>{rentalValid ? accountMoney(groups.rentals.rentalAmount + groups.extensions.rentalAmount) : uiText('기간 확인 필요')}</dd></div>
          <div className="cart-summary__main"><dt>{uiText("파트상품")}</dt><dd>{groups.parts.valid ? accountMoney(groups.parts.amount) : uiText('수량 확인 필요')}</dd></div>
        </div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__points cart-summary__points"><dt>{uiText("적립 포인트")}</dt><dd>{groupList.every(group => group.valid) ? uiText('{points}점', { points: points.toLocaleString('ko-KR') }) : uiText('확인 필요')}</dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
        <div className="purchase-summary__total cart-summary__total"><dt>{uiText("예상 결제 금액")}</dt><dd>{groupList.every(group => group.valid) && Number.isSafeInteger(amount) ? accountMoney(amount) : uiText('확인 필요')}</dd></div>
        <div aria-hidden="true" className="cart-summary__divider" />
      </dl><p>{uiText("쿠폰·포인트는 결제 단계에서 사용할 수 있습니다.")}</p></div>
      <div className="purchase-summary__actions cart-summary__actions"><button type="button" disabled={!valid} onClick={startCheckout}>
        <strong>{uiText('선택 상품 {count}개', { count })}</strong> {uiText("구매하기")}</button></div>
    </aside> : null}
  </div></SelectionContext.Provider>
}
