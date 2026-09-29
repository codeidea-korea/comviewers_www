import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import type { MyRcpcItem } from '@/api/myRcpc'

export const rentalLabels: Record<string, string> = { active: '이용 중', terminated: '종료', refunded: '환불' }
export const connectionLabels: Record<string, string> = { ONLINE: '실행 중', OFFLINE: '오프라인', STALE: '확인 필요', NEVER_CONNECTED: '연결 이력 없음', online: '실행 중', offline: '오프라인', stale: '확인 필요', unknown: '미확인' }
export const serverStatusLabels: Record<string, string> = { needs_attention: '확인 필요', format_waiting: '포맷 대기', extension_waiting: '연장대기', running: '실행 중', ended: '종료' }
export const endedRental = (status: string) => ['terminated', 'refunded'].includes(status)
export const extensionBlocked = (item: Pick<MyRcpcItem, 'rentalStatus' | 'serverStatus' | 'usageStatus'>) =>
  endedRental(item.rentalStatus) || item.usageStatus === 'ended' || item.serverStatus === 'ended' || item.serverStatus === 'format_waiting'
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
