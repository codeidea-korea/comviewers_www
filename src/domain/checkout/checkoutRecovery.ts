import { z } from 'zod'
import type { CheckoutCancellationRequest } from '@/api/ordersPayments'
import { checkoutReturnTo } from './checkoutReturnTo'

const prefix = 'comviewers.checkout.recovery.v1:'
// Tab session only. Keep the creation payload briefly; never persist receipt identifiers or PG credentials.
const lifetime = 2 * 60 * 60 * 1000
const recordSchema = z.object({ expiresAt: z.number().int().positive(), returnTo: z.string().max(2048),
  request: z.object({ creationKey: z.uuidv4(), source: z.enum(['cart', 'extension']), originalRequest: z.record(z.string(), z.unknown()) }),
  orderNo: z.string().max(100).nullable().default(null),
})
export type CheckoutRecovery = z.infer<typeof recordSchema>

function scheduleExpiry(key: string, expiresAt: number): void {
  setTimeout(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return
      const current = recordSchema.safeParse(JSON.parse(raw))
      if (!current.success || current.data.expiresAt <= Date.now()) sessionStorage.removeItem(key)
    } catch { /* Session closure or storage denial requires no further persistence. */ }
  }, Math.max(0, expiresAt - Date.now()))
}

export function checkoutRecoveryKey(organizationId: string, memberId: string, identity: string): string {
  return `${prefix}${organizationId}:${memberId}:${encodeURIComponent(identity)}`
}

export function readCheckoutRecovery(key: string): CheckoutRecovery | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    if (raw.length > 65536) { sessionStorage.removeItem(key); return null }
    const parsed = recordSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || parsed.data.expiresAt <= Date.now() || parsed.data.expiresAt > Date.now() + lifetime) { sessionStorage.removeItem(key); return null }
    scheduleExpiry(key, parsed.data.expiresAt)
    return { ...parsed.data, returnTo: checkoutReturnTo(parsed.data.returnTo) }
  } catch { return null }
}

export function saveCheckoutRecovery(key: string, request: CheckoutCancellationRequest, returnTo: string): CheckoutRecovery {
  const record = recordSchema.parse({ expiresAt: Date.now() + lifetime, request, returnTo: checkoutReturnTo(returnTo), orderNo: null })
  const raw = JSON.stringify(record)
  if (raw.length > 65536) throw new Error('주문서 복구 정보를 보관할 수 없습니다.')
  try { sessionStorage.setItem(key, raw) } catch { throw new Error('주문서 복구 정보를 보관할 수 없습니다. 브라우저 저장 공간을 확인해 주세요.') }
  scheduleExpiry(key, record.expiresAt)
  return record
}

export function clearCheckoutRecovery(key?: string): void {
  try {
    const keys = key ? [key] : Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter((value): value is string => Boolean(value?.startsWith(prefix)))
    keys.forEach(value => sessionStorage.removeItem(value))
  } catch { /* A storage denial cannot change the server's order/cancellation result. */ }
}

export function bindCheckoutRecoveryOrder(key: string, orderNo: string): void {
  const record = readCheckoutRecovery(key)
  if (record) try { sessionStorage.setItem(key, JSON.stringify({ ...record, orderNo })) } catch { /* Original creation key remains usable. */ }
}

export function clearCheckoutRecoveryForOrder(organizationId: string, memberId: string, orderNo: string): void {
  try {
    const scope = `${prefix}${organizationId}:${memberId}:`
    Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(scope)))
      .filter(key => readCheckoutRecovery(key)?.orderNo === orderNo).forEach(key => clearCheckoutRecovery(key))
  } catch { /* Optional local cleanup must not alter a confirmed payment. */ }
}
