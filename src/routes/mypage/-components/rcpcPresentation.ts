import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { MyRcpcItem } from '@/api/myRcpc'

export const rentalLabels: Record<string, string> = { active: '이용 중', terminated: '종료', refunded: '환불' }
export const connectionLabels: Record<string, string> = { ONLINE: '실행 중', OFFLINE: '오프라인', STALE: '확인 필요', NEVER_CONNECTED: '확인 필요', online: '실행 중', offline: '오프라인', stale: '확인 필요', unknown: '미확인' }
export const endedRental = (status: string) => ['terminated', 'refunded'].includes(status)
type RentalPeriodItem = Pick<MyRcpcItem, 'rentalStatus' | 'usageStatus' | 'operationalStatus' | 'serviceEndsAt' | 'serviceEndExclusiveDate'>
const kstDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
const kstDate = (date: Date) => {
  const parts = Object.fromEntries(kstDateFormat.formatToParts(date).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export const rentalEndDate = (item: RentalPeriodItem) => item.serviceEndsAt
  ? kstDate(new Date(item.serviceEndsAt)) : item.serviceEndExclusiveDate
export function rentalDaysRemaining(item: RentalPeriodItem, now = new Date()): number | null {
  const endDate = rentalEndDate(item)
  return endDate ? Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${kstDate(now)}T00:00:00Z`)) / 86_400_000) : null
}

export function rentalPeriodText(item: RentalPeriodItem): string {
  const status = rentalOperationalStatus(item)
  if (status === 'rental_waiting') return '이용대기'
  if (status === 'terminated' || status === 'refunded') return '이용 종료'
  const endsAt = item.serviceEndsAt ? Date.parse(item.serviceEndsAt) : NaN
  const now = Date.now()
  if (Number.isFinite(endsAt) && now >= endsAt) {
    const elapsedDays = Math.floor((now - endsAt) / 86_400_000)
    return elapsedDays === 0 ? '만료됨' : `${elapsedDays}일 지남`
  }
  const days = rentalDaysRemaining(item)
  if (days === null) return '-'
  if (days < 0) return `${Math.abs(days)}일 지남`
  return days === 0 ? '오늘 만료' : `${days}일 남음`
}
export function rentalOperationalStatus(item: RentalPeriodItem) {
  if (endedRental(item.rentalStatus)) return item.rentalStatus
  if (item.usageStatus === 'ended') return 'terminated'
  if (item.operationalStatus === 'terminated' || item.operationalStatus === 'refunded' || item.operationalStatus === 'rental_waiting') return item.operationalStatus
  // Recalculate time-derived states locally so an older response does not survive the 48-hour cutoff.
  const days = rentalDaysRemaining(item)
  if (gracePeriodElapsed(item)) return 'termination_waiting'
  if (days !== null) return days <= 1 ? 'extension_waiting' : 'active'
  return item.operationalStatus ?? (item.usageStatus === 'extension_waiting' ? 'extension_waiting' : 'active')
}
const gracePeriodElapsed = (item: RentalPeriodItem, now = new Date()) => {
  const endsAt = item.serviceEndsAt ? Date.parse(item.serviceEndsAt) : NaN
  return Number.isFinite(endsAt) ? now.getTime() >= endsAt + 48 * 60 * 60 * 1000 : (rentalDaysRemaining(item, now) ?? 0) <= -2
}
export const extensionBlocked = (item: RentalPeriodItem) =>
  endedRental(item.rentalStatus) || item.usageStatus === 'ended' || gracePeriodElapsed(item) || ['termination_waiting', 'terminated', 'refunded'].includes(rentalOperationalStatus(item))
export const rentalServiceAccessible = (item: RentalPeriodItem) =>
  item.rentalStatus === 'active' && !extensionBlocked(item) && ['using', 'extension_waiting'].includes(item.usageStatus)
export const traffic = (bytes: number | null) => bytes === null ? '-' : `${(bytes / 1_000_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} GB`
export const totalTraffic = (downloadBytes: number | null, uploadBytes: number | null) =>
  traffic(downloadBytes === null && uploadBytes === null ? null : (downloadBytes ?? 0) + (uploadBytes ?? 0))

export function extensionTarget(item: MyRcpcItem) {
  const spec = item.pcSpec
  return {
    rcpcId: item.productNo,
    alias: item.preference.alias || undefined,
    currentEnd: item.serviceEndExclusiveDate ?? undefined,
    location: item.serverRoomName ?? undefined,
    os: [spec?.osName, spec?.osVersion].filter(Boolean).join(' '),
    cpu: [spec?.cpuModel, spec?.cpuCores == null ? null : `${spec.cpuCores}코어`, spec?.cpuThreads == null ? null : `${spec.cpuThreads}스레드`].filter(Boolean).join(' · '),
    ram: [spec?.ramGb == null ? null : `${spec.ramGb}GB`, spec?.ramType].filter(Boolean).join(' '),
    disk: spec ? [`SSD ${spec.ssdGb ?? '-'}GB`, `HDD ${spec.hddGb ?? '-'}GB`].join(' / ') : '',
    gpu: [spec?.gpuModel, spec?.gpuVramGb == null ? null : `${spec.gpuVramGb}GB`].filter(Boolean).join(' · '),
  }
}

// Enumerate the caller's authorized rentals, not public/admin server-room data.
export async function loadAuthorizedRcpcs(api: MyRcpcReadServices, signal?: AbortSignal): Promise<MyRcpcItem[]> {
  const first = await api.list({ page: 0, size: 100 }, signal)
  let items = first.items
  for (let page = 1; page < first.totalPages; page += 1) {
    signal?.throwIfAborted()
    const next = await api.list({ page, size: 100 }, signal)
    items = [...items, ...next.items]
  }
  return items.filter((item, index) => items.findIndex((candidate) => candidate.rentalId === item.rentalId) === index)
}
