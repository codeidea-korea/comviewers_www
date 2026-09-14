import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { AccountStorageItem } from '@/api/myAccountSchemas'
import { cartQueryKeys } from '@/domain/cart/cartRepository'

export function StorageMoveToCartAction({ api, item }: { api: MyAccountReadServices; item: AccountStorageItem }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const minimum = item.minUnits ?? 1
  const maximum = item.maxUnits ?? minimum
  const rental = item.pricingType === 'rental'
  const contractReady = item.pricingType === 'one_time' || (rental && item.minUnits !== null && item.maxUnits !== null)
  const [units, setUnits] = useState(minimum)
  const keys = useRef<Record<string, string>>({})
  const [checkoutRequested, setCheckoutRequested] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const validUnits = !rental || (Number.isInteger(units) && units >= minimum && units <= maximum)
  const move = useMutation({
    mutationFn: () => {
      const duration = rental ? units : null
      const signature = String(duration)
      const key = keys.current[signature] ?? crypto.randomUUID()
      keys.current = { ...keys.current, [signature]: key }
      return api.moveStorageToCart(item.id, duration, key)
    },
    onSuccess: async value => {
      setReviewing(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-account', 'http', 'storage'] }),
        queryClient.invalidateQueries({ queryKey: cartQueryKeys.all }),
      ])
      if (checkoutRequested && value.cartItemId) void navigate(`/checkout?cartItemId=${encodeURIComponent(value.cartItemId)}`)
    },
  })
  if (item.status !== 'stored') return <span>-</span>
  if (!contractReady) return <span>이용기간 확인 필요</span>
  if (reviewing) return <span className="storage-move-action">
    <span>{rental ? `${units}${item.billingUnit ? ` ${item.billingUnit}` : '단위'}` : '1개'}를 장바구니로 이동합니다.</span>
    <button disabled={move.isPending} onClick={() => move.mutate()} type="button">{move.isPending ? '이동 중' : '확인'}</button>
    <button disabled={move.isPending} onClick={() => setReviewing(false)} type="button">취소</button>
    {move.isError ? <span role="alert">이동하지 못했습니다.</span> : null}
  </span>
  return <span className="storage-move-action">
    {rental ? <label>이용기간<input aria-label={`${item.productTitle ?? item.productNo ?? '보관 상품'} 이용기간`} max={maximum} min={minimum} onChange={(event) => setUnits(Number(event.target.value))} type="number" value={units} /></label> : null}
    <button disabled={move.isPending || !validUnits} onClick={() => { setCheckoutRequested(false); setReviewing(true) }} type="button">장바구니 이동</button>
    <button disabled={move.isPending || !validUnits} onClick={() => { setCheckoutRequested(true); setReviewing(true) }} type="button">주문서 작성</button>
  </span>
}
