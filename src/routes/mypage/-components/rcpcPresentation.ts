import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { MyRcpcItem } from '@/api/myRcpc'

export const connectionLabels: Record<string, string> = { ONLINE: '실행 중', OFFLINE: '확인 필요', STALE: '확인 필요', NEVER_CONNECTED: '확인 필요', online: '실행 중', offline: '확인 필요', stale: '확인 필요', unknown: '미확인' }
export const endedRental = (status: string) => ['terminated', 'refunded'].includes(status)
type RentalPeriodItem = Pick<MyRcpcItem, 'rentalStatus' | 'usageStatus' | 'operationalStatus' | 'serviceStartedAt' | 'serviceEndsAt' | 'serviceEndExclusiveDate'>
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
  if (endedRental(item.rentalStatus)) return '이용 종료'
  if (rentalStartsLater(item)) return '이용 시작 전'
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
  if (item.rentalStatus !== 'active') return null
  if (rentalStartsLater(item)) return null
  if (item.operationalStatus !== undefined
    && item.operationalStatus !== 'active' && item.operationalStatus !== 'extension_waiting') return item.operationalStatus
  // Refresh time-derived states across KST date boundaries without promoting explicit null or preparation states.
  const days = rentalDaysRemaining(item)
  if (gracePeriodElapsed(item)) return 'termination_waiting'
  if (days !== null) return days <= 1 ? 'extension_waiting' : 'active'
  if (item.operationalStatus !== undefined) return item.operationalStatus
  return item.usageStatus === 'extension_waiting' ? 'extension_waiting' : item.usageStatus === 'using' ? 'active' : null
}
const rentalStartsLater = (item: RentalPeriodItem) => Boolean(item.serviceStartedAt && Date.parse(item.serviceStartedAt) > Date.now())
const gracePeriodElapsed = (item: RentalPeriodItem, now = new Date()) => (rentalDaysRemaining(item, now) ?? 0) <= -2
export const extensionBlocked = (item: RentalPeriodItem) =>
  endedRental(item.rentalStatus) || item.usageStatus === 'ended' || rentalStartsLater(item) || gracePeriodElapsed(item)
  || (rentalOperationalStatus(item) !== 'active' && rentalOperationalStatus(item) !== 'extension_waiting')
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
