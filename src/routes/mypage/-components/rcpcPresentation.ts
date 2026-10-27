import { translateUiText } from '@/i18n/uiTranslation'
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
  if (endedRental(item.rentalStatus) && !rentalResumptionWaiting(item)) return translateUiText('이용 종료')
  if (rentalStartsLater(item)) return translateUiText('이용 시작 전')
  const endsAt = item.serviceEndsAt ? Date.parse(item.serviceEndsAt) : NaN
  const now = Date.now()
  if (Number.isFinite(endsAt) && now >= endsAt) {
    const elapsedDays = Math.floor((now - endsAt) / 86_400_000)
    return elapsedDays === 0 ? translateUiText('만료됨') : translateUiText('{v0}일 지남', { v0: elapsedDays })
  }
  const days = rentalDaysRemaining(item)
  if (days === null) return '-'
  if (days < 0) return translateUiText('{v0}일 지남', { v0: Math.abs(days) })
  return days === 0 ? translateUiText('오늘 만료') : translateUiText('{v0}일 남음', { v0: days })
}
export function rentalOperationalStatus(item: RentalPeriodItem) {
  if (rentalResumptionWaiting(item)) return 'extension_waiting'
  if (item.rentalStatus !== 'active') return null
  if (rentalStartsLater(item)) return null
  if (item.operationalStatus !== undefined
    && item.operationalStatus !== 'active' && item.operationalStatus !== 'extension_waiting') return item.operationalStatus
  // Refresh time-derived states across KST date boundaries without promoting explicit null or preparation states.
  const days = rentalDaysRemaining(item)
  if (days !== null) return days <= 1 ? 'extension_waiting' : 'active'
  if (item.operationalStatus !== undefined) return item.operationalStatus
  return item.usageStatus === 'extension_waiting' ? 'extension_waiting' : item.usageStatus === 'using' ? 'active' : null
}
const rentalStartsLater = (item: RentalPeriodItem) => Boolean(item.serviceStartedAt && Date.parse(item.serviceStartedAt) > Date.now())
export const rentalResumptionWaiting = (item: RentalPeriodItem) => endedRental(item.rentalStatus)
  && item.usageStatus === 'extension_waiting' && item.operationalStatus === 'extension_waiting'
export const rentalActionsEnded = (item: RentalPeriodItem) => endedRental(item.rentalStatus) || item.usageStatus === 'ended' || rentalOperationalStatus(item) === 'termination_waiting'
export const extensionBlocked = (item: RentalPeriodItem) =>
  !rentalResumptionWaiting(item) && (endedRental(item.rentalStatus) || item.usageStatus === 'ended' || rentalStartsLater(item)
  || (rentalOperationalStatus(item) !== 'active' && rentalOperationalStatus(item) !== 'extension_waiting'))
export const rentalServiceAccessible = (item: RentalPeriodItem) =>
  // WAN/reboot operations retain their separate API grace window; renewal has no expiry cutoff.
  item.rentalStatus === 'active' && !extensionBlocked(item) && (rentalDaysRemaining(item) ?? 0) > -2
  && ['using', 'extension_waiting'].includes(item.usageStatus)
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
    cpu: [spec?.cpuModel, spec?.cpuThreads == null ? null : translateUiText('{v0}스레드', { v0: spec.cpuThreads })].filter(Boolean).join(' · '),
    cpuCores: spec?.cpuCores ?? null,
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
